import { NextResponse, type NextRequest } from "next/server";

import { ApiError, toPublicError } from "@/lib/api/errors";
import { analysisIdParamsSchema } from "@/lib/api/schemas";
import { deleteAnalysis, getAnalysis } from "@/lib/repositories/analyses";
import {
  createSessionId,
  getSessionIdFromRequest,
  setSessionCookie,
} from "@/lib/security/session";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const existingSessionId = getSessionIdFromRequest(request);
    const sessionId = existingSessionId ?? createSessionId();
    const { id } = analysisIdParamsSchema.parse(await context.params);
    const analysis = await getAnalysis(id, sessionId);

    if (!analysis) {
      throw new ApiError("Analysis not found.", 404);
    }

    const response = NextResponse.json({ ok: true, data: analysis });
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const existingSessionId = getSessionIdFromRequest(request);
    const sessionId = existingSessionId ?? createSessionId();
    const { id } = analysisIdParamsSchema.parse(await context.params);
    const deleted = await deleteAnalysis(id, sessionId);

    if (!deleted) {
      throw new ApiError("Analysis not found.", 404);
    }

    const response = NextResponse.json({ ok: true });
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
