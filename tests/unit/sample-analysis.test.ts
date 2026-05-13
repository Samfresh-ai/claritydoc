import { describe, expect, it } from "vitest";

import { mockSampleAnalysis } from "@/lib/ai/providers/mock";

describe("deterministic sample analysis", () => {
  it("meets the required risky sample acceptance criteria", () => {
    const riskText = mockSampleAnalysis.risks
      .map((risk) => `${risk.title} ${risk.explanation} ${risk.why_it_matters}`)
      .join(" ")
      .toLowerCase();
    const actionText = mockSampleAnalysis.actions
      .map((action) => `${action.action} ${action.rationale}`)
      .join(" ")
      .toLowerCase();

    expect(mockSampleAnalysis.verdict).toBe("risky");
    expect(riskText).toContain("24-month global non-compete");
    expect(riskText).toContain("unlimited revisions");
    expect(riskText).toContain("forfeits all unpaid compensation");
    expect(riskText).toContain("60 days");
    expect(riskText).toContain("moral rights waiver");

    expect(actionText).toContain("milestone payments");
    expect(actionText).toContain("revision");
    expect(actionText).toContain("paid for completed work");
    expect(actionText).toContain("remove the global non-compete");
  });
});
