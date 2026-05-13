import "server-only";

import {
  analysisResultSchema,
  chunkEvidenceSchema,
  type AiUsage,
  type AnalysisResult,
  type ChunkEvidence,
} from "@/lib/ai/schemas";
import {
  buildChunkEvidencePrompt,
  buildConsolidatedAnalysisPrompt,
  buildContractAnalysisPrompt,
  CONTRACT_ANALYSIS_SYSTEM_PROMPT,
  LEGAL_DISCLAIMER,
} from "@/lib/ai/prompts/contract-analysis";
import { FallbackAiProvider } from "@/lib/ai/providers/fallback";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { MockAiProvider } from "@/lib/ai/providers/mock";
import { NvidiaProvider } from "@/lib/ai/providers/nvidia";
import type { AiProvider } from "@/lib/ai/providers/types";
import {
  CHUNK_SIZE_CHARS,
  SINGLE_PASS_DOCUMENT_CHARS,
} from "@/lib/document/limits";
import { normalizeWhitespace, splitIntoChunks } from "@/lib/document/text";
import { getAiProviderName, getServerEnv, isMockAiEnabled } from "@/lib/env";

export type AnalyzeDocumentResult = {
  result: AnalysisResult;
  model: string;
  usage: AiUsage;
  warnings: string[];
};

export async function analyzeDocumentText(
  text: string,
  provider = getAiProvider(),
): Promise<AnalyzeDocumentResult> {
  const normalized = normalizeWhitespace(text);
  const warnings: string[] = [];

  if (normalized.length <= SINGLE_PASS_DOCUMENT_CHARS) {
    const response = await provider.completeJson({
      system: CONTRACT_ANALYSIS_SYSTEM_PROMPT,
      user: buildContractAnalysisPrompt(normalized),
      schema: analysisResultSchema,
      maxTokens: 4_500,
    });

    return {
      result: normalizeDisclaimer(response.data),
      model: response.model,
      usage: response.usage,
      warnings,
    };
  }

  warnings.push(
    "This document was large, so ClarityDoc analyzed it in chunks and consolidated the findings.",
  );

  const chunks = splitIntoChunks(normalized, CHUNK_SIZE_CHARS);
  const chunkEvidence: ChunkEvidence[] = [];
  const usageTotals: AiUsage = { inputTokens: 0, outputTokens: 0 };
  let model = "unknown";

  for (let index = 0; index < chunks.length; index += 1) {
    const response = await provider.completeJson({
      system: CONTRACT_ANALYSIS_SYSTEM_PROMPT,
      user: buildChunkEvidencePrompt(chunks[index], index + 1, chunks.length),
      schema: chunkEvidenceSchema,
      maxTokens: 3_000,
    });

    chunkEvidence.push(response.data);
    model = response.model;
    usageTotals.inputTokens =
      (usageTotals.inputTokens ?? 0) + (response.usage.inputTokens ?? 0);
    usageTotals.outputTokens =
      (usageTotals.outputTokens ?? 0) + (response.usage.outputTokens ?? 0);
  }

  const consolidated = await provider.completeJson({
    system: CONTRACT_ANALYSIS_SYSTEM_PROMPT,
    user: buildConsolidatedAnalysisPrompt(chunkEvidence),
    schema: analysisResultSchema,
    maxTokens: 4_500,
  });

  usageTotals.inputTokens =
    (usageTotals.inputTokens ?? 0) + (consolidated.usage.inputTokens ?? 0);
  usageTotals.outputTokens =
    (usageTotals.outputTokens ?? 0) + (consolidated.usage.outputTokens ?? 0);

  return {
    result: normalizeDisclaimer(consolidated.data),
    model: consolidated.model || model,
    usage: usageTotals,
    warnings,
  };
}

export function getAiProvider(): AiProvider {
  if (isMockAiEnabled()) {
    return new MockAiProvider();
  }

  const env = getServerEnv();

  if (getAiProviderName() === "nvidia") {
    const nvidiaProvider = new NvidiaProvider();

    if (env.GEMINI_API_KEY) {
      return new FallbackAiProvider({
        primaryName: "nvidia",
        fallbackName: "gemini",
        primary: nvidiaProvider,
        fallback: new GeminiProvider(),
      });
    }

    return nvidiaProvider;
  }

  return new GeminiProvider();
}

function normalizeDisclaimer(result: AnalysisResult): AnalysisResult {
  return {
    ...result,
    disclaimer: result.disclaimer || LEGAL_DISCLAIMER,
  };
}
