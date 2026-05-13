import { createHash } from "node:crypto";
import path from "node:path";

import {
  MAX_FILENAME_LENGTH,
  SUPPORTED_EXTENSIONS,
  type SupportedExtension,
} from "@/lib/document/limits";

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function hashDocumentText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function textPreview(text: string, maxLength = 520): string {
  const normalized = normalizeWhitespace(text).replace(/\s+/g, " ");
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}...`
    : normalized;
}

export function sanitizeFilename(
  filename: string | null | undefined,
): string | null {
  if (!filename) {
    return null;
  }

  const base = path.basename(filename);
  const cleaned = base
    .replace(/[^\w.\- ()]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, MAX_FILENAME_LENGTH)
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

export function getSupportedExtension(
  filename: string,
): SupportedExtension | null {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.find((supported) => supported === ext) ?? null;
}

export function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const next = Math.min(cursor + chunkSize, text.length);
    const boundary = text.lastIndexOf("\n\n", next);
    const end = boundary > cursor + chunkSize * 0.55 ? boundary : next;
    chunks.push(text.slice(cursor, end).trim());
    cursor = end;
  }

  return chunks.filter(Boolean);
}
