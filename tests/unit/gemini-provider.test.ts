import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  AiProviderError,
  GeminiProvider,
  parseModelJson,
} from "@/lib/ai/providers/gemini";

const tinySchema = z.object({ ok: z.boolean() }).strict();

describe("GeminiProvider hardening", () => {
  it("rejects malformed model JSON without exposing raw text", () => {
    expect(() => parseModelJson("not json")).toThrow(AiProviderError);
  });

  it("retries once on transient provider errors", async () => {
    let calls = 0;
    const provider = new GeminiProvider({
      model: "test-model",
      client: {
        models: {
          async generateContent() {
            calls += 1;
            if (calls === 1) {
              throw { status: 500 };
            }

            return {
              text: '{"ok":true}',
              usageMetadata: {
                promptTokenCount: 1,
                candidatesTokenCount: 1,
              },
            };
          },
        },
      },
    });

    await expect(
      provider.completeJson({
        system: "Return JSON.",
        user: "Return JSON.",
        schema: tinySchema,
      }),
    ).resolves.toMatchObject({ data: { ok: true }, model: "test-model" });
    expect(calls).toBe(2);
  });

  it("retries once when the model returns malformed JSON", async () => {
    let calls = 0;
    const provider = new GeminiProvider({
      model: "test-model",
      client: {
        models: {
          async generateContent() {
            calls += 1;

            return {
              text: calls === 1 ? "not json" : '{"ok":true}',
              usageMetadata: {
                promptTokenCount: 1,
                candidatesTokenCount: 1,
              },
            };
          },
        },
      },
    });

    await expect(
      provider.completeJson({
        system: "Return JSON.",
        user: "Return JSON.",
        schema: tinySchema,
      }),
    ).resolves.toMatchObject({ data: { ok: true }, model: "test-model" });
    expect(calls).toBe(2);
  });

  it("aborts long provider requests", async () => {
    const provider = new GeminiProvider({
      model: "test-model",
      requestTimeoutMs: 1,
      client: {
        models: {
          async generateContent(params) {
            return new Promise((_, reject) => {
              params.config?.abortSignal?.addEventListener("abort", () => {
                reject(new DOMException("Aborted", "AbortError"));
              });
            });
          },
        },
      },
    });

    await expect(
      provider.completeJson({
        system: "Return JSON.",
        user: "Return JSON.",
        schema: tinySchema,
      }),
    ).rejects.toThrow(AiProviderError);
  });

  it("sends system instructions and requests JSON mode", async () => {
    const provider = new GeminiProvider({
      model: "test-model",
      client: {
        models: {
          async generateContent(params) {
            expect(params.config?.systemInstruction).toBe("Return JSON.");
            expect(params.config?.responseMimeType).toBe("application/json");
            expect(JSON.stringify(params.contents)).toContain("untrusted");

            return { text: '{"ok":true}' };
          },
        },
      },
    });

    await expect(
      provider.completeJson({
        system: "Return JSON.",
        user: "Analyze <untrusted>text</untrusted>.",
        schema: tinySchema,
      }),
    ).resolves.toMatchObject({ data: { ok: true } });
  });
});
