import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiskGroups } from "@/components/risk-groups";
import { mockSampleAnalysis } from "@/lib/ai/providers/mock";

describe("RiskGroups", () => {
  it("renders risks grouped by severity with plain-English context", () => {
    render(<RiskGroups risks={mockSampleAnalysis.risks} />);

    expect(screen.getByTestId("risk-group-high")).toBeInTheDocument();
    expect(screen.getByText("24-month global non-compete")).toBeInTheDocument();
    expect(
      screen.getByText(/Unlimited revisions can turn/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Negotiation:/).length).toBeGreaterThan(0);
  });
});
