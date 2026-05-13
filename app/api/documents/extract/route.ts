import { NextResponse, type NextRequest } from "next/server";

import { toPublicError } from "@/lib/api/errors";
import { extractUploadSchema } from "@/lib/api/schemas";
import { MAX_UPLOAD_BYTES } from "@/lib/document/limits";
import { estimateTokens } from "@/lib/document/metrics";
import {
  DocumentExtractionError,
  extractTextFromUpload,
} from "@/lib/document/extract";
import { ensureSessionId } from "@/lib/security/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES + 8_192) {
      throw new DocumentExtractionError(
        "That file is too large for this MVP. Upload a file under 10 MB.",
        413,
      );
    }

    const formData = await request.formData();
    const { file } = extractUploadSchema.parse({ file: formData.get("file") });

    const extracted = await extractTextFromUpload(file);
    const response = NextResponse.json({
      ok: true,
      data: {
        ...extracted,
        estimatedTokens: estimateTokens(extracted.text),
      },
    });

    ensureSessionId(request, response);
    return response;
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(
      { ok: false, error: publicError.message },
      { status: publicError.status },
    );
  }
}
