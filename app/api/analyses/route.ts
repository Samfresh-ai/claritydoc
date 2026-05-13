import { NextResponse, type NextRequest } from "next/server";

import { toPublicError } from "@/lib/api/errors";
import { listAnalyses } from "@/lib/repositories/analyses";
import {
  createSessionId,
  getSessionIdFromRequest,
  setSessionCookie,
} from "@/lib/security/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const existingSessionId = getSessionIdFromRequest(request);
    const sessionId = existingSessionId ?? createSessionId();
    const analyses = await listAnalyses(sessionId);
    const response = NextResponse.json({
      ok: true,
      data: analyses.map((analysis) => ({
        id: analysis.id,
        documentId: analysis.documentId,
        createdAt: analysis.createdAt,
        modelUsed: analysis.modelUsed,
        verdict: analysis.result.verdict,
        documentType: analysis.result.document_type,
        summary: analysis.result.summary,
        originalFilename: analysis.document.originalFilename,
      })),
    });

    if (!existingSessionId) {
      setSessionCookie(response, sessionId);
    }

    return response;
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(
      { ok: false, error: publicError.message },
      { status: publicError.status },
    );
  }
}
