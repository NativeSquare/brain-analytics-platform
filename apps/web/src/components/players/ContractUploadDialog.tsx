"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { toast } from "sonner";
import { IconUpload, IconLoader2, IconFile } from "@tabler/icons-react";

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ContractUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: Id<"players">;
}

export function ContractUploadDialog({
  open,
  onOpenChange,
  playerId,
}: ContractUploadDialogProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const uploadContract = useMutation(api.contracts.mutations.uploadContract);

  const abortRef = React.useRef<AbortController | null>(null);

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    setSelectedFile(null);
    setFileError(null);
    setIsUploading(false);
  }

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate PDF
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setFileError("Only PDF files are accepted.");
      setSelectedFile(null);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("File size must be under 50 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setFileError("Please select a PDF file.");
      return;
    }

    setIsUploading(true);
    setFileError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const { storageId } = await response.json();

      // Step 3: Create/replace contract record (triggers AI extraction)
      await uploadContract({
        playerId,
        fileId: storageId as Id<"_storage">,
      });

      toast.success("Contract uploaded — extraction in progress");
      reset();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = getConvexErrorMessage(error);
      setFileError(message);
      toast.error(message);
    } finally {
      abortRef.current = null;
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Contract</DialogTitle>
          <DialogDescription>
            Upload a PDF contract file. AI will automatically extract key fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File input area */}
          <label
            htmlFor="contract-file-input"
            className="border-input hover:bg-accent/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors"
          >
            {selectedFile ? (
              <>
                <IconFile className="text-primary mb-2 size-8" />
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <IconUpload className="text-muted-foreground mb-2 size-8" />
                <p className="text-sm font-medium">Click to select a PDF</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Maximum file size: 50 MB
                </p>
              </>
            )}
            <input
              id="contract-file-input"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>

          {fileError && (
            <p className="text-destructive text-sm">{fileError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isUploading || !selectedFile}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <IconLoader2 className="mr-2 size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <IconUpload className="mr-1 size-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
