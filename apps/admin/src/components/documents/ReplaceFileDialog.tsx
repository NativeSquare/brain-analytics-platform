"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  extractExtension,
} from "@packages/shared/documents";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import { FileDropZone } from "./FileDropZone";

interface ReplaceFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: Id<"documents">;
  documentName: string;
}

export function ReplaceFileDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
}: ReplaceFileDialogProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isReplacing, setIsReplacing] = React.useState(false);

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const replaceFile = useMutation(api.documents.mutations.replaceFile);

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setSelectedFile(null);
      setIsReplacing(false);
    }
    onOpenChange(newOpen);
  }

  async function handleReplace() {
    if (!selectedFile) return;

    setIsReplacing(true);
    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const { storageId } = await response.json();

      // Step 3: Replace file mutation
      const extension = extractExtension(selectedFile.name);
      await replaceFile({
        documentId,
        storageId,
        filename: selectedFile.name,
        extension,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      toast.success("File replaced");
      handleOpenChange(false);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsReplacing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Replace File</DialogTitle>
          <DialogDescription>
            Replace the file for &ldquo;{documentName}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This will permanently replace the current file. The previous version
            cannot be recovered.
          </p>

          <FileDropZone
            onFileSelected={setSelectedFile}
            accept={SUPPORTED_MIME_TYPES.join(",")}
            maxSize={MAX_FILE_SIZE_BYTES}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isReplacing || !selectedFile}
            onClick={handleReplace}
          >
            {isReplacing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Replacing...
              </>
            ) : (
              "Replace File"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
