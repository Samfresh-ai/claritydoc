import "server-only";

import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";

import type {
  AiJsonRequest,
  AiJsonResponse,
  AiProvider,
} from "@/lib/ai/providers/types";
import { getServerEnv } from "@/lib/env";

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 45_000;

type GeminiTextPart = { text?: string };
type GeminiCandidate = { content?: { parts?: GeminiTextPart[] } };
type GeminiResponse = {
  text?: string;
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

type GeminiClient = {
  models: {
    generateContent(params: GenerateContentParameters): Promise<GeminiResponse>;
  };
};

type GeminiProviderOptions = {
  apiKey?: string;
  model?: string;
  client?: GeminiClient;
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

export class GeminiProvider implements AiProvider {
  private readonly client: GeminiClient;
  private readonly model: string;
  private readonly requestTimeoutMs: number;

  constructor(options: GeminiProviderOptions = {}) {
    const env = getServerEnv();
    const apiKey = options.apiKey ?? env.GEMINI_API_KEY;

    if (!options.client && !apiKey) {
      throw new AiProviderError(
        "GEMINI_API_KEY is not configured. Set MOCK_AI=true for local deterministic analysis.",
        false,
        undefined,
        "missing_api_key",
      );
    }

    this.client = options.client ?? new GoogleGenAI({ apiKey: apiKey ?? "" });
    this.model = options.model ?? env.GEMINI_MODEL ?? DEFAULT_MODEL;
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
        this.client.models.generateContent({
          model: this.model,
          contents: [{ role: "user", parts: [{ text: request.user }] }],
          config: {
            abortSignal: controller.signal,
            maxOutputTokens: request.maxTokens ?? 4_000,
            responseMimeType: "application/json",
            systemInstruction: request.system,
            temperature: 0,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
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
        model: this.model,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount,
          outputTokens: response.usageMetadata?.candidatesTokenCount,
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

function extractResponseText(response: GeminiResponse): string {
  const directText = response.text?.trim();
  if (directText) {
    return directText;
  }

  return (
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
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
