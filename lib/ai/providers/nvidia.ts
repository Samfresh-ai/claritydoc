import "server-only";

import type {
  AiJsonRequest,
  AiJsonResponse,
  AiProvider,
} from "@/lib/ai/providers/types";
import { getServerEnv } from "@/lib/env";

const DEFAULT_MODEL = "mistralai/mistral-small-4-119b-2603";
const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const REQUEST_TIMEOUT_MS = 120_000;

type NvidiaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type NvidiaChatRequest = {
  model: string;
  messages: NvidiaMessage[];
  temperature: number;
  max_tokens: number;
  response_format: { type: "json_object" };
};

type NvidiaChatResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type NvidiaClient = {
  createChatCompletion(
    body: NvidiaChatRequest,
    signal: AbortSignal,
  ): Promise<NvidiaChatResponse>;
};

type NvidiaProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  client?: NvidiaClient;
  requestTimeoutMs?: number;
};

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly transient = false,
    public readonly providerStatus?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export class NvidiaProvider implements AiProvider {
  private readonly client: NvidiaClient;
  private readonly model: string;
  private readonly requestTimeoutMs: number;

  constructor(options: NvidiaProviderOptions = {}) {
    const env = getServerEnv();
    const apiKey = options.apiKey ?? env.NVIDIA_API_KEY;
    const baseUrl = options.baseUrl ?? env.NVIDIA_BASE_URL ?? DEFAULT_BASE_URL;

    if (!options.client && !apiKey) {
      throw new AiProviderError(
        "NVIDIA_API_KEY is not configured. Set MOCK_AI=true for local deterministic analysis.",
        false,
        undefined,
        "missing_api_key",
      );
    }

    this.client =
      options.client ??
      new FetchNvidiaClient({
        apiKey: apiKey ?? "",
        baseUrl,
      });
    this.model = options.model ?? env.NVIDIA_MODEL ?? DEFAULT_MODEL;
    this.requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  async completeJson<T>(request: AiJsonRequest<T>): Promise<AiJsonResponse<T>> {
    return retryOnce(async () => this.sendJsonRequest(request));
  }

  private async sendJsonRequest<T>(
    request: AiJsonRequest<T>,
  ): Promise<AiJsonResponse<T>> {
    const controller = new AbortController();

    try {
      const response = await withTimeout(
        this.client.createChatCompletion(
          {
            model: this.model,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user },
            ],
            temperature: 0,
            max_tokens: request.maxTokens ?? 4_000,
            response_format: { type: "json_object" },
          },
          controller.signal,
        ),
        this.requestTimeoutMs,
        () => controller.abort(),
      );

      const rawText = extractResponseText(response);
      const json = parseModelJson(rawText);
      const parsed = request.schema.safeParse(json);

      if (!parsed.success) {
        throw new AiProviderError(
          "The model returned malformed analysis JSON.",
          true,
          undefined,
          "malformed_json",
        );
      }

      return {
        data: parsed.data,
        model: response.model ?? this.model,
        usage: {
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
        },
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      if (isAbort(error)) {
        throw new AiProviderError(
          "The analysis request timed out.",
          false,
          undefined,
          "timeout",
        );
      }

      const providerStatus = getProviderStatus(error);
      throw new AiProviderError(
        providerStatus
          ? `The analysis provider failed with status ${providerStatus}.`
          : "The analysis provider failed.",
        isTransient(error),
        providerStatus,
        providerStatus ? "http_error" : "provider_failure",
      );
    }
  }
}

class FetchNvidiaClient implements NvidiaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor({ apiKey, baseUrl }: { apiKey: string; baseUrl: string }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async createChatCompletion(
    body: NvidiaChatRequest,
    signal: AbortSignal,
  ): Promise<NvidiaChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw await buildHttpError(response);
    }

    return (await response.json()) as NvidiaChatResponse;
  }
}

export function parseModelJson(rawText: string): unknown {
  const trimmed = rawText
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new AiProviderError(
      "The model did not return JSON.",
      true,
      undefined,
      "malformed_json",
    );
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new AiProviderError(
      "The model returned invalid JSON.",
      true,
      undefined,
      "malformed_json",
    );
  }
}

async function buildHttpError(response: Response): Promise<Error> {
  let body = "";

  try {
    body = await response.text();
  } catch {
    body = response.statusText;
  }

  const error = new Error(
    `NVIDIA provider request failed with status ${response.status}.`,
  ) as Error & { status?: number; body?: string };
  error.status = response.status;
  error.body = body.slice(0, 500);
  return error;
}

function extractResponseText(response: NvidiaChatResponse): string {
  return (
    response.choices
      ?.map(
        (choice) =>
          choice.message?.content ?? choice.message?.reasoning_content ?? "",
      )
      .join("")
      .trim() ?? ""
  );
}

async function retryOnce<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AiProviderError && error.transient) {
      return operation();
    }

    throw error;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      onTimeout();
      reject(
        new AiProviderError(
          "The analysis request timed out.",
          false,
          undefined,
          "timeout",
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message.toLowerCase().includes("abort") ||
      error.message.toLowerCase().includes("timed out"))
  );
}

function isTransient(error: unknown): boolean {
  const status = getProviderStatus(error);
  return (
    typeof status === "number" &&
    (status === 408 || status === 429 || status >= 500)
  );
}

function getProviderStatus(error: unknown): number | undefined {
  const maybeStatus = error as {
    code?: number;
    status?: number;
    statusCode?: number;
  };
  return maybeStatus.status ?? maybeStatus.statusCode ?? maybeStatus.code;
}
