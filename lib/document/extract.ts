import "server-only";

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

import {
  MAX_DOCUMENT_CHARS,
  MAX_UPLOAD_BYTES,
  SUPPORTED_MIME_TYPES,
} from "@/lib/document/limits";
import {
  getSupportedExtension,
  normalizeWhitespace,
  sanitizeFilename,
} from "@/lib/document/text";

export type ExtractedDocument = {
  text: string;
  filename: string | null;
  extension: ".txt" | ".pdf" | ".docx";
  characterCount: number;
  warning: string | null;
};

export class DocumentExtractionError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

export async function extractTextFromUpload(
  file: File,
): Promise<ExtractedDocument> {
  const filename = sanitizeFilename(file.name);
  const extension = filename ? getSupportedExtension(filename) : null;

  if (!filename || !extension) {
    throw new DocumentExtractionError(
      "Unsupported file type. Upload a .txt, .pdf, or .docx file.",
      415,
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new DocumentExtractionError(
      "That file is too large for this MVP. Upload a file under 10 MB.",
      413,
    );
  }

  if (
    file.type &&
    !SUPPORTED_MIME_TYPES.some((supportedType) => supportedType === file.type)
  ) {
    throw new DocumentExtractionError(
      "Unsupported file type. Upload a .txt, .pdf, or .docx file.",
      415,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawText: string;

  try {
    rawText = await extractTextFromBuffer(buffer, extension);
  } catch {
    throw new DocumentExtractionError(
      "Could not extract readable text from this file. Try a text-based PDF, .docx, or .txt file.",
      422,
    );
  }

  const text =
    extension === ".pdf"
      ? cleanExtractedPdfText(rawText)
      : normalizeWhitespace(rawText);

  if (!text) {
    if (extension === ".pdf") {
      throw new DocumentExtractionError(
        "This PDF does not appear to contain extractable text. OCR is not supported yet.",
        422,
      );
    }

    throw new DocumentExtractionError(
      "No readable text was found in this file.",
      422,
    );
  }

  if (text.length > MAX_DOCUMENT_CHARS) {
    throw new DocumentExtractionError(
      "This document is too large for analysis. Try a shorter agreement or split the file.",
      413,
    );
  }

  return {
    text,
    filename,
    extension,
    characterCount: text.length,
    warning:
      extension === ".pdf"
        ? "PDF text extraction can miss scanned pages, tables, and handwritten notes."
        : null,
  };
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  extension: ".txt" | ".pdf" | ".docx",
): Promise<string> {
  if (extension === ".txt") {
    return buffer.toString("utf8");
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export function cleanExtractedPdfText(text: string): string {
  return normalizeWhitespace(text)
    .replace(/^--\s*\d+\s+of\s+\d+\s*--$/gim, "")
    .trim();
}
