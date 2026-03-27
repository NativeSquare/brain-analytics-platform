import {
  FileText,
  Image,
  FileSpreadsheet,
  Video,
  File,
  type LucideIcon,
} from "lucide-react";

/**
 * Returns the appropriate Lucide icon component for a document based on its
 * extension or whether it is a video link.
 */
export function getDocumentIcon(document: {
  extension?: string;
  videoUrl?: string;
}): LucideIcon {
  if (document.videoUrl) return Video;

  switch (document.extension?.toLowerCase()) {
    case "pdf":
      return FileText;
    case "jpg":
    case "jpeg":
    case "png":
      return Image;
    case "xlsx":
    case "csv":
      return FileSpreadsheet;
    default:
      return File;
  }
}
