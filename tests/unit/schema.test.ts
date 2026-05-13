import { describe, expect, it } from "vitest";

import { analysisResultSchema } from "@/lib/ai/schemas";
import { mockSampleAnalysis } from "@/lib/ai/providers/mock";

describe("analysisResultSchema", () => {
  it("accepts the structured sample analysis", () => {
    expect(analysisResultSchema.parse(mockSampleAnalysis).verdict).toBe(
      "risky",
    );
  });

  it("rejects malformed verdict values", () => {
    const parsed = analysisResultSchema.safeParse({
      ...mockSampleAnalysis,
      verdict: "dangerous",
    });

    expect(parsed.success).toBe(false);
  });
});
