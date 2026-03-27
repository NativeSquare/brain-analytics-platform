import { z } from "zod";
import {
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
} from "@packages/shared/documents";

/**
 * Validation schema for the file upload form.
 */
export const uploadFileSchema = z
  .object({
    file: z.instanceof(File, { message: "Please select a file." }),
    name: z.string().optional(),
    folderId: z.string(),
  })
  .refine((data) => data.file.size <= MAX_FILE_SIZE_BYTES, {
    message: "File size exceeds the 50MB limit.",
    path: ["file"],
  })
  .refine(
    (data) =>
      (SUPPORTED_MIME_TYPES as readonly string[]).includes(data.file.type),
    {
      message: "Unsupported file type. Accepted: PDF, JPG, PNG, XLSX, CSV.",
      path: ["file"],
    },
  );

export type UploadFileFormValues = z.infer<typeof uploadFileSchema>;

/**
 * Validation schema for the video link form.
 */
export const addVideoLinkSchema = z.object({
  videoUrl: z
    .string()
    .url("Please enter a valid URL.")
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      "URL must start with http:// or https://",
    ),
  name: z.string().min(1, "Document name is required."),
  folderId: z.string(),
});

export type AddVideoLinkFormValues = z.infer<typeof addVideoLinkSchema>;
