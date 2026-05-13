import { z } from "zod";
import { describe, expect, it } from "vitest";

import { FallbackAiProvider } from "@/lib/ai/providers/fallback";
import { AiProviderError } from "@/lib/ai/providers/nvidia";
import type { AiJsonRequest, AiProvider } from "@/lib/ai/providers/types";

const tinySchema = z.object({ ok: z.boolean() }).strict();

describe("FallbackAiProvider", () => {
  it("uses the fallback provider when the primary provider fails", async () => {
    const primary: AiProvider = {
      async completeJson() {
        throw new AiProviderError(
          "The analysis provider failed with status 502.",
          false,
          502,
          "http_error",
        );
      },
    };
    const fallback: AiProvider = {
      async completeJson<T>(request: AiJsonRequest<T>) {
        return {
          data: request.schema.parse({ ok: true }),
          model: "gemini-test-model",
          usage: { inputTokens: 1, outputTokens: 1 },
        };
      },
    };

    await expect(
      new FallbackAiProvider({
        primaryName: "nvidia",
        fallbackName: "gemini",
        primary,
        fallback,
      }).completeJson({
        system: "Return JSON.",
        user: "Return JSON.",
        schema: tinySchema,
      }),
    ).resolves.toMatchObject({
      data: { ok: true },
      model: "gemini-fallback:gemini-test-model",
    });
  });

  it("does not hide non-provider coding errors", async () => {
    const primary: AiProvider = {
      async completeJson() {
        throw new Error("Unexpected bug.");
      },
    };
    const fallback: AiProvider = {
      async completeJson<T>(request: AiJsonRequest<T>) {
        return {
          data: request.schema.parse({ ok: true }),
          model: "gemini-test-model",
          usage: {},
        };
      },
    };

    await expect(
      new FallbackAiProvider({
        primaryName: "nvidia",
        fallbackName: "gemini",
        primary,
        fallback,
      }).completeJson({
        system: "Return JSON.",
        user: "Return JSON.",
        schema: tinySchema,
      }),
    ).rejects.toThrow("Unexpected bug.");
  });
});
