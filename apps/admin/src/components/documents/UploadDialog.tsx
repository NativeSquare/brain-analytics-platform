"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { SUPPORTED_MIME_TYPES } from "@packages/shared/documents";
import { extractExtension } from "@packages/shared/documents";
import { MAX_FILE_SIZE_BYTES } from "@packages/shared/documents";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import { FileDropZone } from "./FileDropZone";
import {
  uploadFileSchema,
  addVideoLinkSchema,
  type AddVideoLinkFormValues,
} from "./schemas";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: Id<"folders">;
  folderName: string;
}

export function UploadDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
}: UploadDialogProps) {
  const [activeTab, setActiveTab] = React.useState<string>("file");
  const [isUploading, setIsUploading] = React.useState(false);

  // File upload state (managed manually since File can't be in react-hook-form easily with zod refine)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [fileError, setFileError] = React.useState<string | null>(null);

  // Video link form
  const videoForm = useForm<AddVideoLinkFormValues>({
    resolver: zodResolver(addVideoLinkSchema),
    defaultValues: { videoUrl: "", name: "", folderId: folderId as string },
  });

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const uploadDocument = useMutation(api.documents.mutations.uploadDocument);
  const addVideoLink = useMutation(api.documents.mutations.addVideoLink);

  function resetAll() {
    setSelectedFile(null);
    setFileName("");
    setFileError(null);
    videoForm.reset({ videoUrl: "", name: "", folderId: folderId as string });
    setActiveTab("file");
    setIsUploading(false);
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      resetAll();
    }
    onOpenChange(newOpen);
  }

  async function handleFileUpload() {
    if (!selectedFile) {
      setFileError("Please select a file.");
      return;
    }

    // Validate via schema
    const result = uploadFileSchema.safeParse({
      file: selectedFile,
      name: fileName || undefined,
      folderId: folderId as string,
    });

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      setFileError(firstIssue?.message ?? "Validation error");
      return;
    }

    setIsUploading(true);
    setFileError(null);

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const { storageId } = await response.json();

      // Step 3: Create document record
      const extension = extractExtension(selectedFile.name);
      const docName =
        fileName.trim() ||
        selectedFile.name.replace(/\.[^.]+$/, ""); // filename without extension

      await uploadDocument({
        folderId,
        name: docName,
        filename: selectedFile.name,
        extension,
        storageId,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      toast.success("Document uploaded");
      resetAll();
      onOpenChange(false);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleVideoLinkSubmit(data: AddVideoLinkFormValues) {
    setIsUploading(true);
    try {
      await addVideoLink({
        folderId,
        name: data.name,
        videoUrl: data.videoUrl,
      });
      toast.success("Video link added");
      resetAll();
      onOpenChange(false);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a file or video link to {folderName}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1">
              File Upload
            </TabsTrigger>
            <TabsTrigger value="video" className="flex-1">
              Video Link
            </TabsTrigger>
          </TabsList>

          {/* ---- File Upload Tab ---- */}
          <TabsContent value="file" className="space-y-4 pt-2">
            <FileDropZone
              onFileSelected={setSelectedFile}
              accept={SUPPORTED_MIME_TYPES.join(",")}
              maxSize={MAX_FILE_SIZE_BYTES}
              error={fileError ?? undefined}
            />

            <Field>
              <FieldLabel>Document Name (optional)</FieldLabel>
              <Input
                placeholder="Defaults to filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>Folder</FieldLabel>
              <Input value={folderName} readOnly className="bg-muted" />
            </Field>

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
                disabled={isUploading || !selectedFile}
                onClick={handleFileUpload}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ---- Video Link Tab ---- */}
          <TabsContent value="video" className="pt-2">
            <form
              onSubmit={videoForm.handleSubmit(handleVideoLinkSubmit)}
              className="space-y-4"
            >
              <Field>
                <FieldLabel>Video URL</FieldLabel>
                <Input
                  placeholder="https://..."
                  {...videoForm.register("videoUrl")}
                />
                {videoForm.formState.errors.videoUrl && (
                  <FieldError>
                    {videoForm.formState.errors.videoUrl.message}
                  </FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel>Video Name</FieldLabel>
                <Input
                  placeholder="Video name"
                  {...videoForm.register("name")}
                />
                {videoForm.formState.errors.name && (
                  <FieldError>
                    {videoForm.formState.errors.name.message}
                  </FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel>Folder</FieldLabel>
                <Input value={folderName} readOnly className="bg-muted" />
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Link"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
