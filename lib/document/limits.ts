export const MIN_DOCUMENT_CHARS = 80;
export const MAX_DOCUMENT_CHARS = 180_000;
export const SINGLE_PASS_DOCUMENT_CHARS = 55_000;
export const CHUNK_SIZE_CHARS = 32_000;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_FILENAME_LENGTH = 140;

export const SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".docx"] as const;
export const SUPPORTED_MIME_TYPES = [
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];
