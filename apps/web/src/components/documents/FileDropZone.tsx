"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@packages/shared/documents";

interface FileDropZoneProps {
  onFileSelected: (file: File) => void;
  accept: string;
  maxSize: number;
  /** Optional error from parent (e.g. form validation) */
  error?: string;
}

export function FileDropZone({
  onFileSelected,
  accept,
  maxSize,
  error: externalError,
}: FileDropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [internalError, setInternalError] = React.useState<string | null>(null);

  const error = externalError ?? internalError;

  const acceptedMimeTypes = React.useMemo(
    () => accept.split(",").map((t) => t.trim()),
    [accept],
  );

  function validateFile(file: File): string | null {
    if (file.size > maxSize) {
      return "File size exceeds the 50MB limit.";
    }
    if (!acceptedMimeTypes.includes(file.type)) {
      return "Unsupported file type. Accepted: PDF, JPG, PNG, XLSX, CSV.";
    }
    return null;
  }

  function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setInternalError(validationError);
      setSelectedFile(null);
      return;
    }
    setInternalError(null);
    setSelectedFile(file);
    onFileSelected(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be re-selected
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          error && "border-destructive",
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="size-8 text-muted-foreground" />
        {selectedFile ? (
          <div className="text-center">
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Drag and drop a file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              PDF, JPG, PNG, XLSX, CSV &middot; Max 50MB
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
