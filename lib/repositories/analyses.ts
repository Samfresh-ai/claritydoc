import "server-only";

import type { AnalysisResult, AiUsage } from "@/lib/ai/schemas";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { hashDocumentText, textPreview } from "@/lib/document/text";
import { isEphemeralStorageEnabled } from "@/lib/env";

export type StoredAnalysis = {
  id: string;
  documentId: string;
  sessionId: string;
  result: AnalysisResult;
  modelUsed: string;
  usage: AiUsage | null;
  createdAt: string;
  document: {
    id: string;
    originalFilename: string | null;
    documentType: string | null;
    textHash: string;
    textPreview: string;
    createdAt: string;
  };
};

type SaveAnalysisInput = {
  sessionId: string;
  text: string;
  originalFilename: string | null;
  storeFullText: boolean;
  result: AnalysisResult;
  modelUsed: string;
  usage: AiUsage;
};

const memory = {
  documents: new Map<
    string,
    StoredAnalysis["document"] & { sessionId: string; fullText: string | null }
  >(),
  analyses: new Map<string, StoredAnalysis>(),
};

export async function saveAnalysis(
  input: SaveAnalysisInput,
): Promise<StoredAnalysis> {
  const documentHash = hashDocumentText(input.text);
  const preview = textPreview(input.text);

  if (!isDatabaseConfigured()) {
    ensureMemoryPersistenceAllowed();
    const documentId = crypto.randomUUID();
    const analysisId = crypto.randomUUID();
    const now = new Date().toISOString();
    const document = {
      id: documentId,
      sessionId: input.sessionId,
      originalFilename: input.originalFilename,
      documentType: input.result.document_type,
      textHash: documentHash,
      textPreview: preview,
      fullText: input.storeFullText ? input.text : null,
      createdAt: now,
    };
    const analysis: StoredAnalysis = {
      id: analysisId,
      documentId,
      sessionId: input.sessionId,
      result: input.result,
      modelUsed: input.modelUsed,
      usage: input.usage,
      createdAt: now,
      document,
    };

    memory.documents.set(documentId, document);
    memory.analyses.set(analysisId, analysis);
    return analysis;
  }

  const prisma = getPrisma();
  const created = await prisma.document.create({
    data: {
      sessionId: input.sessionId,
      originalFilename: input.originalFilename,
      documentType: input.result.document_type,
      textHash: documentHash,
      textPreview: preview,
      fullText: input.storeFullText ? input.text : null,
      analyses: {
        create: {
          sessionId: input.sessionId,
          result: input.result,
          modelUsed: input.modelUsed,
          usage: input.usage,
        },
      },
    },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return mapPrismaAnalysis({
    ...created.analyses[0],
    document: created,
  });
}

export async function listAnalyses(
  sessionId: string,
): Promise<StoredAnalysis[]> {
  if (!isDatabaseConfigured()) {
    ensureMemoryPersistenceAllowed();
    return [...memory.analyses.values()]
      .filter((analysis) => analysis.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const prisma = getPrisma();
  const analyses = await prisma.analysis.findMany({
    where: { sessionId },
    include: { document: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return analyses.map(mapPrismaAnalysis);
}

export async function getAnalysis(
  id: string,
  sessionId: string,
): Promise<StoredAnalysis | null> {
  if (!isDatabaseConfigured()) {
    ensureMemoryPersistenceAllowed();
    const analysis = memory.analyses.get(id);
    return analysis?.sessionId === sessionId ? analysis : null;
  }

  const prisma = getPrisma();
  const analysis = await prisma.analysis.findFirst({
    where: { id, sessionId },
    include: { document: true },
  });

  return analysis ? mapPrismaAnalysis(analysis) : null;
}

export async function deleteAnalysis(
  id: string,
  sessionId: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    ensureMemoryPersistenceAllowed();
    const analysis = memory.analyses.get(id);
    if (!analysis || analysis.sessionId !== sessionId) {
      return false;
    }
    memory.analyses.delete(id);
    memory.documents.delete(analysis.documentId);
    return true;
  }

  const prisma = getPrisma();
  const analysis = await prisma.analysis.findFirst({
    where: { id, sessionId },
    select: { id: true, documentId: true },
  });

  if (!analysis) {
    return false;
  }

  await prisma.document.delete({ where: { id: analysis.documentId } });
  return true;
}

function ensureMemoryPersistenceAllowed(): void {
  if (process.env.NODE_ENV === "production" && !isEphemeralStorageEnabled()) {
    throw new Error(
      "DATABASE_URL is required in production unless EPHEMERAL_STORAGE=true.",
    );
  }
}

function mapPrismaAnalysis(analysis: {
  id: string;
  documentId: string;
  sessionId: string;
  result: unknown;
  modelUsed: string;
  usage: unknown;
  createdAt: Date;
  document: {
    id: string;
    originalFilename: string | null;
    documentType: string | null;
    textHash: string;
    textPreview: string;
    createdAt: Date;
  };
}): StoredAnalysis {
  return {
    id: analysis.id,
    documentId: analysis.documentId,
    sessionId: analysis.sessionId,
    result: analysis.result as AnalysisResult,
    modelUsed: analysis.modelUsed,
    usage: analysis.usage as AiUsage | null,
    createdAt: analysis.createdAt.toISOString(),
    document: {
      id: analysis.document.id,
      originalFilename: analysis.document.originalFilename,
      documentType: analysis.document.documentType,
      textHash: analysis.document.textHash,
      textPreview: analysis.document.textPreview,
      createdAt: analysis.document.createdAt.toISOString(),
    },
  };
}
