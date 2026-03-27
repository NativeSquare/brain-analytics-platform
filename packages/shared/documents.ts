/**
 * Document Hub constants for the Brain Analytics Platform.
 * Single source of truth for document-related values used across backend and frontend.
 */

/** Supported file extensions for uploads. */
export const SUPPORTED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "xlsx",
  "csv",
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/** MIME types corresponding to supported extensions. */
export const SUPPORTED_FILE_TYPES: Record<SupportedExtension, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
};

/** Flat array of all accepted MIME types (for file input `accept`). */
export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/** Extension → MIME mapping (same as SUPPORTED_FILE_TYPES, exported under canonical name). */
export const EXTENSION_TO_MIME: Record<string, string> = { ...SUPPORTED_FILE_TYPES };

/** MIME → canonical extension mapping. */
export const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
};

/** Maximum file size in bytes (50 MB). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 52428800

/** Maximum folder nesting depth (top-level + one subfolder level). */
export const MAX_FOLDER_DEPTH = 2;

/** Document type discriminator. */
export const DOCUMENT_TYPES = ["file", "video"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable file size string.
 * e.g. 2457600 → "2.3 MB", 150000 → "146.5 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  // Show decimals only for KB+ and when not a whole number
  if (i === 0) return `${bytes} B`;
  const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1);
  return `${formatted} ${units[i]}`;
}

/**
 * Extracts the lowercase extension from a filename.
 * e.g. "report.PDF" → "pdf", "image.test.jpg" → "jpg"
 */
export function extractExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}
