"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";

import { SUPPORTED_MIME_TYPES } from "@packages/shared/documents";
import { extractExtension } from "@packages/shared/documents";
import { MAX_FILE_SIZE_BYTES } from "@packages/shared/documents";
import { ROLE_LABELS } from "@packages/shared/roles";
import type { UserRole } from "@packages/shared/roles";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";
import { FileDropZone } from "./FileDropZone";
import {
  uploadFileSchema,
  addVideoLinkSchema,
  type AddVideoLinkFormValues,
} from "./schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SharingMode = "private" | "roles" | "users";

const SHAREABLE_ROLES: UserRole[] = ["coach", "analyst", "physio", "player", "staff"];

interface SelectedUser {
  _id: Id<"users">;
  fullName: string;
  email?: string;
  role?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  // File upload state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [fileError, setFileError] = React.useState<string | null>(null);

  // Sharing state
  const [sharingMode, setSharingMode] = React.useState<SharingMode>("private");
  const [selectedRoles, setSelectedRoles] = React.useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = React.useState<SelectedUser[]>([]);
  const [userSearchInput, setUserSearchInput] = React.useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = React.useState("");

  // Video link form
  const videoForm = useForm<AddVideoLinkFormValues>({
    resolver: zodResolver(addVideoLinkSchema),
    defaultValues: { videoUrl: "", name: "", folderId: folderId as string },
  });

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const uploadDocument = useMutation(api.documents.mutations.uploadDocument);
  const addVideoLink = useMutation(api.documents.mutations.addVideoLink);

  // Debounced user search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserSearch(userSearchInput), 300);
    return () => clearTimeout(timer);
  }, [userSearchInput]);

  // Search team users for "users" sharing mode
  const userSearchResults = useQuery(
    api.users.queries.searchTeamUsers,
    sharingMode === "users" && debouncedUserSearch.length >= 2
      ? { search: debouncedUserSearch }
      : "skip",
  );

  // Abort controller for in-flight file uploads
  const abortRef = React.useRef<AbortController | null>(null);

  function resetAll() {
    abortRef.current?.abort();
    abortRef.current = null;
    setSelectedFile(null);
    setFileName("");
    setFileError(null);
    setSharingMode("private");
    setSelectedRoles(new Set());
    setSelectedUsers([]);
    setUserSearchInput("");
    setDebouncedUserSearch("");
    videoForm.reset({ videoUrl: "", name: "", folderId: folderId as string });
    setActiveTab("file");
    setIsUploading(false);
  }

  // Abort any in-flight upload on unmount
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      resetAll();
    }
    onOpenChange(newOpen);
  }

  function buildSharingArg() {
    if (sharingMode === "private") {
      return { mode: "private" as const };
    }
    if (sharingMode === "roles") {
      return {
        mode: "roles" as const,
        roles: Array.from(selectedRoles),
      };
    }
    // users
    return {
      mode: "users" as const,
      userIds: selectedUsers.map((u) => u._id),
    };
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
        sharing: buildSharingArg(),
      });

      toast.success("Document uploaded");
      resetAll();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(getConvexErrorMessage(error));
    } finally {
      abortRef.current = null;
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
        sharing: buildSharingArg(),
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

  const handleRoleToggle = (role: string, checked: boolean) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(role);
      } else {
        next.delete(role);
      }
      return next;
    });
  };

  const handleAddUser = (user: SelectedUser) => {
    if (selectedUsers.some((u) => u._id === user._id)) return;
    setSelectedUsers((prev) => [...prev, user]);
    setUserSearchInput("");
  };

  const handleRemoveUser = (userId: Id<"users">) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  // Filter search results to exclude already-selected users
  const filteredUserResults = userSearchResults?.filter(
    (u) => !selectedUsers.some((su) => su._id === u._id),
  );

  // Sharing section (shared between file and video tabs)
  const sharingSection = (
    <div className="space-y-3">
      <Field>
        <FieldLabel>Sharing</FieldLabel>
        <Select
          value={sharingMode}
          onValueChange={(val) => {
            setSharingMode(val as SharingMode);
            setSelectedRoles(new Set());
            setSelectedUsers([]);
            setUserSearchInput("");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Only me</SelectItem>
            <SelectItem value="roles">Specific roles</SelectItem>
            <SelectItem value="users">Specific people</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Role checkboxes */}
      {sharingMode === "roles" && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Select which roles can access this document. Admins always have access.
          </p>
          {SHAREABLE_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedRoles.has(role)}
                onCheckedChange={(checked) =>
                  handleRoleToggle(role, checked === true)
                }
              />
              <span className="text-sm">{ROLE_LABELS[role]}</span>
            </label>
          ))}
        </div>
      )}

      {/* User picker */}
      {sharingMode === "users" && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            Search and select people who can access this document.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={userSearchInput}
              onChange={(e) => setUserSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Search results */}
          {filteredUserResults && filteredUserResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-md border bg-popover">
              {filteredUserResults.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() =>
                    handleAddUser({
                      _id: u._id,
                      fullName: u.fullName,
                      email: u.email,
                      role: u.role,
                    })
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                >
                  <Avatar className="size-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(u.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm">{u.fullName}</span>
                  {u.role && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {ROLE_LABELS[u.role as UserRole] ?? u.role}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-1">
              {selectedUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5"
                >
                  <Avatar className="size-5">
                    <AvatarFallback className="text-xs">
                      {getInitials(u.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm">{u.fullName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 shrink-0"
                    type="button"
                    onClick={() => handleRemoveUser(u._id)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
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

            {sharingSection}

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

              {sharingSection}

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
