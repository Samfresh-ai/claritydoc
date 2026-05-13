import { SAMPLE_CONTRACT } from "@/lib/sample-contract";
import type { AnalysisResult } from "@/lib/ai/schemas";
import type {
  AiJsonRequest,
  AiJsonResponse,
  AiProvider,
} from "@/lib/ai/providers/types";
import { LEGAL_DISCLAIMER } from "@/lib/ai/prompts/contract-analysis";

export const mockSampleAnalysis: AnalysisResult = {
  summary:
    "This freelance service agreement requires John Doe to build a mobile application for Nexora Technologies within 90 days, with payment due only after completion and review. Several terms are unusually one-sided against the service provider, especially the global non-compete, unlimited revisions, delayed payment, and termination forfeiture.",
  document_type: "Freelance service agreement",
  parties: [
    { name: "Nexora Technologies Ltd", role: "Client", confidence: "high" },
    { name: "John Doe", role: "Service Provider", confidence: "high" },
  ],
  obligations: [
    {
      party: "Service Provider",
      obligation:
        "Design and develop a mobile application as specified in Exhibit A.",
      deadline: "Within 90 days of signing",
      source_reference: "Section 1. SERVICES",
      importance: "high",
    },
    {
      party: "Client",
      obligation:
        "Pay $8,500 only after project completion, subject to a review period.",
      deadline: "Up to 60 days after delivery pending review",
      source_reference: "Section 2. PAYMENT",
      importance: "high",
    },
    {
      party: "Service Provider",
      obligation:
        "Transfer work product to the Client upon full payment and waive moral rights.",
      deadline: "Upon full payment",
      source_reference: "Section 3. INTELLECTUAL PROPERTY",
      importance: "high",
    },
    {
      party: "Service Provider",
      obligation:
        "Avoid working for any competitor of the Client globally for 24 months after termination.",
      deadline: "24 months following termination",
      source_reference: "Section 4. NON-COMPETE",
      importance: "high",
    },
    {
      party: "Service Provider",
      obligation:
        "Provide unlimited revisions at no additional cost for 12 months after delivery.",
      deadline: "12 months post-delivery",
      source_reference: "Section 5. REVISIONS",
      importance: "high",
    },
  ],
  risks: [
    {
      severity: "high",
      title: "24-month global non-compete",
      explanation:
        "The service provider cannot work for any competitor worldwide for two years after termination.",
      why_it_matters:
        "That restriction could block normal freelance work and may be overbroad by duration, geography, and scope.",
      suggested_negotiation:
        "Remove the non-compete or replace it with a narrow non-solicit limited to named clients and a short period.",
      source_reference: "Section 4. NON-COMPETE",
    },
    {
      severity: "high",
      title: "Termination causes forfeiture of unpaid compensation",
      explanation:
        "The Client can terminate with seven days' notice and the Service Provider forfeits all unpaid compensation.",
      why_it_matters:
        "The provider could complete substantial work and receive nothing if the Client terminates near delivery.",
      suggested_negotiation:
        "Require payment for work performed, approved milestones, and non-cancellable expenses through the termination date.",
      source_reference: "Section 7. TERMINATION",
    },
    {
      severity: "high",
      title: "Payment delayed until completion and review",
      explanation:
        "The full $8,500 is due only after completion, and payment may be withheld for up to 60 days after delivery.",
      why_it_matters:
        "This shifts cash-flow risk to the provider and creates leverage for delayed or disputed acceptance.",
      suggested_negotiation:
        "Add upfront and milestone payments, objective acceptance criteria, and a shorter review window.",
      source_reference: "Section 2. PAYMENT",
    },
    {
      severity: "high",
      title: "Unlimited revisions for 12 months",
      explanation:
        "The Client can request unlimited revisions at no additional cost for a full year after delivery.",
      why_it_matters:
        "Unlimited revisions can turn a fixed-fee project into open-ended unpaid work.",
      suggested_negotiation:
        "Limit revisions by number, scope, and time window, with change-order pricing for extra work.",
      source_reference: "Section 5. REVISIONS",
    },
    {
      severity: "medium",
      title: "Moral rights waiver and IP transfer concerns",
      explanation:
        "The agreement transfers all work product upon full payment and requires a moral rights waiver.",
      why_it_matters:
        "The transfer timing is better than pre-payment assignment, but the waiver may be broader than necessary and could affect attribution or portfolio rights.",
      suggested_negotiation:
        "Clarify that IP transfers only after cleared full payment and reserve reusable tools, pre-existing code, and portfolio display rights.",
      source_reference: "Section 3. INTELLECTUAL PROPERTY",
    },
  ],
  deadlines: [
    {
      date_or_timeframe: "January 15, 2025",
      event: "Agreement effective date",
      responsible_party: null,
      source_reference: "Introductory paragraph",
    },
    {
      date_or_timeframe: "Within 90 days of signing",
      event: "Mobile application work must be completed",
      responsible_party: "Service Provider",
      source_reference: "Section 1. SERVICES",
    },
    {
      date_or_timeframe: "Up to 60 days after delivery",
      event: "Client may withhold payment pending review",
      responsible_party: "Client",
      source_reference: "Section 2. PAYMENT",
    },
    {
      date_or_timeframe: "7 days notice",
      event: "Client termination notice period",
      responsible_party: "Client",
      source_reference: "Section 7. TERMINATION",
    },
  ],
  actions: [
    {
      action:
        "Negotiate upfront and milestone payments instead of payment only on completion.",
      deadline: "Before signing",
      priority: "urgent",
      rationale:
        "Milestones reduce cash-flow risk and prevent all compensation from depending on final acceptance.",
    },
    {
      action:
        "Replace unlimited revisions with a defined number of revision rounds and paid change orders.",
      deadline: "Before signing",
      priority: "urgent",
      rationale:
        "Clear revision limits keep the fixed fee from becoming open-ended unpaid labor.",
    },
    {
      action:
        "Revise termination terms so the provider is paid for completed work, approved milestones, and non-cancellable costs.",
      deadline: "Before signing",
      priority: "urgent",
      rationale:
        "The current forfeiture language is one of the most financially risky terms.",
    },
    {
      action:
        "Remove the global non-compete or narrow it sharply by client, geography, scope, and duration.",
      deadline: "Before signing",
      priority: "urgent",
      rationale:
        "The current non-compete could block normal work for two years.",
    },
    {
      action:
        "Clarify IP ownership timing, reusable background materials, moral rights, and portfolio rights.",
      deadline: "Before signing",
      priority: "important",
      rationale:
        "IP terms should transfer only what is needed and only after full payment clears.",
    },
  ],
  missing_or_unclear_terms: [
    {
      term: "Acceptance criteria",
      why_it_matters:
        "The Client's review rights are broad because the agreement does not define objective acceptance standards.",
    },
    {
      term: "Late payment remedies",
      why_it_matters:
        "There is no interest, suspension right, or collection-cost protection if payment is delayed.",
    },
    {
      term: "Exhibit A details",
      why_it_matters:
        "The scope depends on Exhibit A, but the sample does not include deliverables, milestones, or technical acceptance criteria.",
    },
  ],
  verdict: "risky",
  verdict_reason:
    "The agreement contains multiple one-sided terms that could leave the service provider unpaid, overworked, and restricted from future work.",
  confidence: "high",
  disclaimer: LEGAL_DISCLAIMER,
};

export class MockAiProvider implements AiProvider {
  async completeJson<T>(request: AiJsonRequest<T>): Promise<AiJsonResponse<T>> {
    const response = request.schema.safeParse(mockSampleAnalysis);

    if (response.success) {
      return {
        data: response.data,
        model: "mock-claritydoc",
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }

    const fallback = request.schema.parse({
      chunk_summary:
        "Mock chunk evidence for a business agreement containing payment, IP, non-compete, revisions, termination, and liability terms.",
      parties: mockSampleAnalysis.parties,
      obligations: mockSampleAnalysis.obligations.slice(0, 4),
      risks: mockSampleAnalysis.risks.slice(0, 4),
      deadlines: mockSampleAnalysis.deadlines.slice(0, 4),
      missing_or_unclear_terms: mockSampleAnalysis.missing_or_unclear_terms,
    });

    return {
      data: fallback as T,
      model: "mock-claritydoc",
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

export function isSampleLike(text: string): boolean {
  return (
    text.includes("FREELANCE SERVICE AGREEMENT") ||
    text.includes(SAMPLE_CONTRACT.slice(0, 60))
  );
}
