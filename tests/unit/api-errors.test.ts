import { describe, expect, it } from "vitest";

import { AiProviderError } from "@/lib/ai/providers/nvidia";
import { toPublicError } from "@/lib/api/errors";

describe("toPublicError", () => {
  it("does not expose provider configuration details to clients", () => {
    const publicError = toPublicError(
      new AiProviderError("NVIDIA_API_KEY is not configured."),
    );

    expect(publicError.status).toBe(502);
    expect(publicError.message).not.toContain("NVIDIA_API_KEY");
    expect(publicError.message).not.toContain("stack");
  });

  it("surfaces provider rate limits without leaking internals", () => {
    const publicError = toPublicError(
      new AiProviderError(
        "The analysis provider failed with status 429.",
        true,
        429,
        "http_error",
      ),
    );

    expect(publicError.status).toBe(502);
    expect(publicError.message).toContain("rate limiting");
    expect(publicError.message).not.toContain("429");
  });
});
