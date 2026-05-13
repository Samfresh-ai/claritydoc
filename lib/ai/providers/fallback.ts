import "server-only";

import type {
  AiJsonRequest,
  AiJsonResponse,
  AiProvider,
} from "@/lib/ai/providers/types";
import { errorContext, logServerWarning } from "@/lib/logger";

type FallbackProviderOptions = {
  primaryName: string;
  fallbackName: string;
  primary: AiProvider;
  fallback: AiProvider;
};

export class FallbackAiProvider implements AiProvider {
  private readonly primaryName: string;
  private readonly fallbackName: string;
  private readonly primary: AiProvider;
  private readonly fallback: AiProvider;

  constructor(options: FallbackProviderOptions) {
    this.primaryName = options.primaryName;
    this.fallbackName = options.fallbackName;
    this.primary = options.primary;
    this.fallback = options.fallback;
  }

  async completeJson<T>(request: AiJsonRequest<T>): Promise<AiJsonResponse<T>> {
    try {
      return await this.primary.completeJson(request);
    } catch (error) {
      if (!isProviderError(error)) {
        throw error;
      }

      logServerWarning(
        "Primary AI provider failed; trying fallback provider.",
        {
          primaryProvider: this.primaryName,
          fallbackProvider: this.fallbackName,
          ...errorContext(error),
        },
      );

      const response = await this.fallback.completeJson(request);

      return {
        ...response,
        model: `${this.fallbackName}-fallback:${response.model}`,
      };
    }
  }
}

function isProviderError(error: unknown): boolean {
  return error instanceof Error && error.name === "AiProviderError";
}
