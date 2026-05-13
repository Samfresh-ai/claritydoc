import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  AiProviderError,
  NvidiaProvider,
  parseModelJson,
} from "@/lib/ai/providers/nvidia";

const tinySchema = z.object({ ok: z.boolean() }).strict();

describe("NvidiaProvider hardening", () => {
  it("rejects malformed model JSON without exposing raw text", () => {
    expect(() => parseModelJson("not json")).toThrow(AiProviderError);
  });

  it("retries once on transient provider errors", async () => {
    let calls = 0;
    const provider = new NvidiaProvider({
      model: "test-model",
      client: {
        async createChatCompletion() {
          calls += 1;
          if (calls === 1) {
            throw { status: 503 };
          }

          return {
            model: "test-model",
            choices: [{ message: { content: '{"ok":true}' } }],
            usage: { prompt_tokens: 1, completion_tokens: 1 },
          };
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
    const provider = new NvidiaProvider({
      model: "test-model",
      client: {
        async createChatCompletion() {
          calls += 1;

          return {
            model: "test-model",
            choices: [
              {
                message: { content: calls === 1 ? "not json" : '{"ok":true}' },
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1 },
          };
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
    const provider = new NvidiaProvider({
      model: "test-model",
      requestTimeoutMs: 1,
      client: {
        async createChatCompletion(_body, signal) {
          return new Promise((_, reject) => {
            signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
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
    const provider = new NvidiaProvider({
      model: "test-model",
      client: {
        async createChatCompletion(body) {
          expect(body.messages[0]).toEqual({
            role: "system",
            content: "Return JSON.",
          });
          expect(body.response_format).toEqual({ type: "json_object" });
          expect(JSON.stringify(body.messages)).toContain("untrusted");

          return { choices: [{ message: { content: '{"ok":true}' } }] };
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
