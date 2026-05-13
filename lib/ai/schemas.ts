import { z } from "zod";

import { MAX_DOCUMENT_CHARS, MIN_DOCUMENT_CHARS } from "@/lib/document/limits";

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const severitySchema = z.enum(["high", "medium", "low"]);
export const importanceSchema = z.enum(["high", "medium", "low"]);
export const prioritySchema = z.enum(["urgent", "important", "normal"]);
export const verdictSchema = z.enum(["favorable", "neutral", "risky"]);

export const partySchema = z
  .object({
    name: z.string().min(1).max(200),
    role: z.string().min(1).max(120),
    confidence: confidenceSchema,
  })
  .strict();

export const obligationSchema = z
  .object({
    party: z.string().min(1).max(200),
    obligation: z.string().min(1).max(900),
    deadline: z.string().min(1).max(200).nullable(),
    source_reference: z.string().min(1).max(300).nullable(),
    importance: importanceSchema,
  })
  .strict();

export const riskSchema = z
  .object({
    severity: severitySchema,
    title: z.string().min(1).max(180),
    explanation: z.string().min(1).max(900),
    why_it_matters: z.string().min(1).max(900),
    suggested_negotiation: z.string().min(1).max(700).nullable(),
    source_reference: z.string().min(1).max(300).nullable(),
  })
  .strict();

export const deadlineSchema = z
  .object({
    date_or_timeframe: z.string().min(1).max(200),
    event: z.string().min(1).max(500),
    responsible_party: z.string().min(1).max(200).nullable(),
    source_reference: z.string().min(1).max(300).nullable(),
  })
  .strict();

export const actionSchema = z
  .object({
    action: z.string().min(1).max(700),
    deadline: z.string().min(1).max(200).nullable(),
    priority: prioritySchema,
    rationale: z.string().min(1).max(700),
  })
  .strict();

export const missingTermSchema = z
  .object({
    term: z.string().min(1).max(220),
    why_it_matters: z.string().min(1).max(700),
  })
  .strict();

export const analysisResultSchema = z
  .object({
    summary: z.string().min(1).max(2_500),
    document_type: z.string().min(1).max(160),
    parties: z.array(partySchema).max(12),
    obligations: z.array(obligationSchema).max(12),
    risks: z.array(riskSchema).max(12),
    deadlines: z.array(deadlineSchema).max(12),
    actions: z.array(actionSchema).max(10),
    missing_or_unclear_terms: z.array(missingTermSchema).max(12),
    verdict: verdictSchema,
    verdict_reason: z.string().min(1).max(900),
    confidence: confidenceSchema,
    disclaimer: z.string().min(1).max(900),
  })
  .strict();

export const analyzeRequestSchema = z
  .object({
    text: z.string().min(MIN_DOCUMENT_CHARS).max(MAX_DOCUMENT_CHARS),
    originalFilename: z.string().min(1).max(140).nullable().optional(),
    inputSource: z.enum(["paste", "upload", "sample"]).default("paste"),
    storeFullText: z.boolean().default(false),
  })
  .strict();

export const chunkEvidenceSchema = z
  .object({
    chunk_summary: z.string().min(1).max(1_500),
    parties: z.array(partySchema).max(8),
    obligations: z.array(obligationSchema).max(10),
    risks: z.array(riskSchema).max(10),
    deadlines: z.array(deadlineSchema).max(10),
    missing_or_unclear_terms: z.array(missingTermSchema).max(10),
  })
  .strict();

export const aiUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
  })
  .strict();

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type ChunkEvidence = z.infer<typeof chunkEvidenceSchema>;
export type AiUsage = z.infer<typeof aiUsageSchema>;
