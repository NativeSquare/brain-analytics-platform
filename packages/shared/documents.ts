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

/** Maximum file size in bytes (50 MB). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 52428800

/** Maximum folder nesting depth (top-level + one subfolder level). */
export const MAX_FOLDER_DEPTH = 2;

/** Document type discriminator. */
export const DOCUMENT_TYPES = ["file", "video"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];
