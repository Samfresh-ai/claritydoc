import { NextResponse, type NextRequest } from "next/server";

import { analyzeDocumentText } from "@/lib/ai/analyze-document";
import { analyzeRequestSchema } from "@/lib/ai/schemas";
import { toPublicError } from "@/lib/api/errors";
import { MAX_DOCUMENT_CHARS } from "@/lib/document/limits";
import { estimateTokens } from "@/lib/document/metrics";
import { normalizeWhitespace, sanitizeFilename } from "@/lib/document/text";
import { errorContext, logServerWarning } from "@/lib/logger";
import { saveAnalysis } from "@/lib/repositories/analyses";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import {
  createSessionId,
  getSessionIdFromRequest,
  setSessionCookie,
} from "@/lib/security/session";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const existingSessionId = getSessionIdFromRequest(request);
    const sessionId = existingSessionId ?? createSessionId();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_DOCUMENT_CHARS + 20_000) {
      return jsonWithSession(
        existingSessionId,
        sessionId,
        { ok: false, error: "The submitted document is too large." },
        413,
      );
    }

    const limit = rateLimit(
      `analyze:${existingSessionId ?? getClientIp(request)}`,
    );
    if (!limit.allowed) {
      const response = jsonWithSession(
        existingSessionId,
        sessionId,
        {
          ok: false,
          error: `Too many analysis requests. Try again in ${limit.retryAfterSeconds} seconds.`,
        },
        429,
      );
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    const payload = analyzeRequestSchema.parse(await request.json());
    const normalizedText = normalizeWhitespace(payload.text);
    const analysis = await analyzeDocumentText(normalizedText);
    const stored = await saveAnalysis({
      sessionId,
      text: normalizedText,
      originalFilename: sanitizeFilename(payload.originalFilename),
      storeFullText: payload.storeFullText,
      result: analysis.result,
      modelUsed: analysis.model,
      usage: analysis.usage,
    });

    return jsonWithSession(existingSessionId, sessionId, {
      ok: true,
      data: {
        analysisId: stored.id,
        documentId: stored.documentId,
        result: analysis.result,
        model: analysis.model,
        usage: analysis.usage,
        warnings: analysis.warnings,
        document: {
          characterCount: normalizedText.length,
          estimatedTokens: estimateTokens(normalizedText),
          storedFullText: payload.storeFullText,
        },
      },
    });
  } catch (error) {
    const publicError = toPublicError(error);
    logServerWarning("Document analysis request failed.", {
      route: "/api/documents/analyze",
      publicStatus: publicError.status,
      ...errorContext(error),
    });
    return NextResponse.json(
      { ok: false, error: publicError.message },
      { status: publicError.status },
    );
  }
}

function jsonWithSession(
  existingSessionId: string | null,
  sessionId: string,
  body: unknown,
  status = 200,
): NextResponse {
  const response = NextResponse.json(body, { status });
  if (!existingSessionId) {
    setSessionCookie(response, sessionId);
  }
  return response;
}
