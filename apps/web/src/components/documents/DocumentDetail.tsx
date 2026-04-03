"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { ExternalLink, Download, Lock, Replace, Trash2 } from "lucide-react";

import { formatFileSize } from "@packages/shared/documents";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getDocumentIcon } from "./documentIcons";

interface DocumentDetailProps {
  documentId: Id<"documents"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  currentUserId?: Id<"users">;
  onReplace?: (docId: Id<"documents">, docName: string) => void;
  onDelete?: (docId: Id<"documents">, docName: string) => void;
  onPermissions?: (docId: Id<"documents">, docName: string, folderId: string) => void;
}

export function DocumentDetail({
  documentId,
  open,
  onOpenChange,
  isAdmin,
  currentUserId,
  onReplace,
  onDelete,
  onPermissions,
}: DocumentDetailProps) {
  const document = useQuery(
    api.documents.queries.getDocument,
    documentId ? { documentId } : "skip",
  );

  const documentUrl = useQuery(
    api.documents.queries.getDocumentUrl,
    documentId ? { documentId } : "skip",
  );

  const trackRead = useMutation(api.documents.mutations.trackRead);

  const isFile = document?.storageId != null;
  const isVideo = document?.videoUrl != null;
  const canManage = isAdmin || (currentUserId != null && document?.ownerId === currentUserId);

  function handleOpenDownload() {
    if (documentUrl && documentId) {
      // Fire-and-forget tracking
      void trackRead({ documentId }).catch(() => {});
      window.open(documentUrl, "_blank");
    }
  }

  function handleWatchVideo() {
    if (document?.videoUrl && documentId) {
      // Fire-and-forget tracking
      void trackRead({ documentId }).catch(() => {});
      window.open(document.videoUrl, "_blank");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Document Details</SheetTitle>
        </SheetHeader>

        {!document ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : (
          <div className="space-y-6 p-4">
            {/* Document Name + Icon */}
            <div className="flex items-start gap-3">
              {React.createElement(getDocumentIcon(document), {
                className: "size-6 shrink-0 text-muted-foreground mt-0.5",
              })}
              <div>
                <h3 className="text-lg font-semibold leading-tight">
                  {document.name}
                </h3>
                <Badge variant="secondary" className="mt-1">
                  {isVideo ? "Video Link" : document.extension?.toUpperCase() ?? "File"}
                </Badge>
              </div>
            </div>

            {/* Metadata */}
            <dl className="space-y-3 text-sm">
              {isFile && document.filename && (
                <div>
                  <dt className="text-muted-foreground">Original Filename</dt>
                  <dd className="font-medium">{document.filename}</dd>
                </div>
              )}

              {isFile && document.fileSize != null && (
                <div>
                  <dt className="text-muted-foreground">File Size</dt>
                  <dd className="font-medium">
                    {formatFileSize(document.fileSize)}
                  </dd>
                </div>
              )}

              {isFile && document.mimeType && (
                <div>
                  <dt className="text-muted-foreground">MIME Type</dt>
                  <dd className="font-medium">{document.mimeType}</dd>
                </div>
              )}

              {isVideo && document.videoUrl && (
                <div>
                  <dt className="text-muted-foreground">Video URL</dt>
                  <dd className="font-medium truncate">{document.videoUrl}</dd>
                </div>
              )}

              <div>
                <dt className="text-muted-foreground">Uploaded By</dt>
                <dd className="font-medium">{document.ownerName}</dd>
              </div>

              <div>
                <dt className="text-muted-foreground">Upload Date</dt>
                <dd className="font-medium">
                  {format(new Date(document.createdAt), "MMM d, yyyy")}
                </dd>
              </div>

              <div>
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="font-medium">
                  {format(new Date(document.updatedAt), "MMM d, yyyy")}
                </dd>
              </div>
            </dl>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              {isFile && (
                <Button
                  onClick={handleOpenDownload}
                  disabled={!documentUrl}
                  className="w-full"
                >
                  <Download className="mr-2 size-4" />
                  Open / Download
                </Button>
              )}

              {isVideo && (
                <Button onClick={handleWatchVideo} className="w-full">
                  <ExternalLink className="mr-2 size-4" />
                  Watch Video
                </Button>
              )}

              {canManage && onPermissions && (
                <Button
                  variant="outline"
                  onClick={() =>
                    onPermissions(document._id, document.name, document.folderId as string)
                  }
                  className="w-full"
                >
                  <Lock className="mr-2 size-4" />
                  Permissions
                </Button>
              )}

              {canManage && isFile && onReplace && (
                <Button
                  variant="outline"
                  onClick={() => onReplace(document._id, document.name)}
                  className="w-full"
                >
                  <Replace className="mr-2 size-4" />
                  Replace File
                </Button>
              )}

              {canManage && onDelete && (
                <Button
                  variant="destructive"
                  onClick={() => onDelete(document._id, document.name)}
                  className="w-full"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
