"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { IconFolderPlus, IconFolders } from "@tabler/icons-react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FolderCard } from "@/components/documents/FolderCard";
import { FolderCreateDialog } from "@/components/documents/FolderCreateDialog";
import { FolderRenameDialog } from "@/components/documents/FolderRenameDialog";
import { FolderDeleteDialog } from "@/components/documents/FolderDeleteDialog";
import { DocumentFolderBreadcrumb } from "@/components/documents/DocumentFolderBreadcrumb";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { DocumentDetail } from "@/components/documents/DocumentDetail";
import { ReplaceFileDialog } from "@/components/documents/ReplaceFileDialog";
import { DocumentDeleteDialog } from "@/components/documents/DocumentDeleteDialog";
import { PermissionsPanel } from "@/components/documents/PermissionsPanel";
import { DocumentSearchToolbar } from "@/components/documents/DocumentSearchToolbar";
import {
  DocumentSearchResults,
  type DocumentSearchResult,
} from "@/components/documents/DocumentSearchResults";
import { useDocumentSearch } from "@/hooks/useDocumentSearch";

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  image: "Images",
  spreadsheet: "Spreadsheets",
  video: "Video Links",
};

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentFolderId = searchParams.get("folder") as Id<"folders"> | null;

  const currentUser = useQuery(api.table.users.currentUser);
  const isAdmin = currentUser?.role === "admin";
  const canManageDoc = (ownerId?: Id<"users">) =>
    isAdmin || (currentUser != null && currentUser._id === ownerId);

  const {
    searchTerm,
    debouncedSearchTerm,
    fileType,
    setSearchTerm,
    setFileType,
    clearSearch,
    isSearchActive,
  } = useDocumentSearch();

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<{
    id: Id<"folders">;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: Id<"folders">;
    name: string;
  } | null>(null);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [selectedDocumentId, setSelectedDocumentId] =
    React.useState<Id<"documents"> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [replaceTarget, setReplaceTarget] = React.useState<{
    id: Id<"documents">;
    name: string;
  } | null>(null);
  const [docDeleteTarget, setDocDeleteTarget] = React.useState<{
    id: Id<"documents">;
    name: string;
  } | null>(null);

  const [permissionsTarget, setPermissionsTarget] = React.useState<{
    type: "folder" | "document";
    id: string;
    name: string;
    folderId?: string;
  } | null>(null);

  const searchResults = useQuery(
    api.documents.queries.searchDocuments,
    isSearchActive
      ? {
          searchTerm: debouncedSearchTerm,
          fileType: fileType || undefined,
        }
      : "skip",
  );

  const topLevelFolders = useQuery(
    api.documents.queries.getFolders,
    !currentFolderId && !isSearchActive ? {} : "skip",
  );

  const folderContents = useQuery(
    api.documents.queries.getFolderContents,
    currentFolderId && !isSearchActive
      ? { folderId: currentFolderId, fileType: fileType || undefined }
      : "skip",
  );

  const visibleFolderIds = React.useMemo(() => {
    if (isSearchActive) return [];
    if (!currentFolderId && topLevelFolders) {
      return topLevelFolders.map((f) => f._id);
    }
    if (currentFolderId && folderContents?.subfolders) {
      return folderContents.subfolders.map((f) => f._id);
    }
    return [];
  }, [isSearchActive, currentFolderId, topLevelFolders, folderContents]);

  const itemCounts = useQuery(
    api.documents.queries.getFolderItemCounts,
    visibleFolderIds.length > 0 ? { folderIds: visibleFolderIds } : "skip",
  );

  const browseDocumentIds = React.useMemo(() => {
    if (isSearchActive) return [] as Id<"documents">[];
    if (currentFolderId && folderContents?.documents) {
      return folderContents.documents.map(
        (d) => d._id as Id<"documents">,
      );
    }
    return [] as Id<"documents">[];
  }, [isSearchActive, currentFolderId, folderContents]);

  const searchDocumentIds = React.useMemo(() => {
    if (!isSearchActive || !searchResults?.results) return [] as Id<"documents">[];
    return searchResults.results.map((d) => d._id as Id<"documents">);
  }, [isSearchActive, searchResults]);

  const activeDocumentIds = isSearchActive ? searchDocumentIds : browseDocumentIds;

  const readStats = useQuery(
    api.documents.queries.getReadStats,
    isAdmin && activeDocumentIds.length > 0
      ? { documentIds: activeDocumentIds }
      : "skip",
  );

  const handleFolderClick = React.useCallback(
    (folderId: Id<"folders">) => {
      router.push(`/documents?folder=${folderId}`);
    },
    [router],
  );

  const handleFolderRename = React.useCallback(
    (folderId: Id<"folders">, name: string) => {
      setRenameTarget({ id: folderId, name });
    },
    [],
  );

  const handleFolderDelete = React.useCallback(
    (folderId: Id<"folders">, name: string) => {
      setDeleteTarget({ id: folderId, name });
    },
    [],
  );

  const handleFolderPermissions = React.useCallback(
    (folderId: Id<"folders">, name: string) => {
      setPermissionsTarget({ type: "folder", id: folderId as string, name });
    },
    [],
  );

  function getItemCount(folderId: Id<"folders">): number {
    if (!itemCounts) return 0;
    const counts = itemCounts[folderId];
    return counts ? counts.subfolders + counts.documents : 0;
  }

  function isFolderRestricted(folder: { permittedRoles?: string[] }): boolean {
    return folder.permittedRoles !== undefined && folder.permittedRoles !== null;
  }

  const handleViewDetails = React.useCallback(
    (docId: string) => {
      setSelectedDocumentId(docId as Id<"documents">);
      setIsDetailOpen(true);
    },
    [],
  );

  const handleReplaceFromCard = React.useCallback(
    (docId: string, docName: string) => {
      setReplaceTarget({ id: docId as Id<"documents">, name: docName });
    },
    [],
  );

  const handleDeleteFromCard = React.useCallback(
    (docId: string, docName: string) => {
      setDocDeleteTarget({ id: docId as Id<"documents">, name: docName });
    },
    [],
  );

  const handleReplaceFromDetail = React.useCallback(
    (docId: Id<"documents">, docName: string) => {
      setReplaceTarget({ id: docId, name: docName });
    },
    [],
  );

  const handleDeleteFromDetail = React.useCallback(
    (docId: Id<"documents">, docName: string) => {
      setDocDeleteTarget({ id: docId, name: docName });
    },
    [],
  );

  const handlePermissionsFromDetail = React.useCallback(
    (docId: Id<"documents">, docName: string, folderId: string) => {
      setPermissionsTarget({
        type: "document",
        id: docId as string,
        name: docName,
        folderId,
      });
    },
    [],
  );

  const handleDocumentDeleted = React.useCallback(() => {
    setIsDetailOpen(false);
    setSelectedDocumentId(null);
  }, []);

  const handleSearchResultClick = React.useCallback(
    (result: DocumentSearchResult) => {
      clearSearch();
      router.push(`/documents?folder=${result.folderId}`);
    },
    [clearSearch, router],
  );

  const canCreateSubfolder =
    isAdmin &&
    currentFolderId &&
    folderContents?.folder &&
    folderContents.folder.parentId === undefined;

  const currentFolderName = folderContents?.folder?.name ?? "";

  if (isSearchActive) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <DocumentSearchToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          fileType={fileType}
          onFileTypeChange={setFileType}
        />

        <DocumentSearchResults
          results={searchResults?.results ?? []}
          totalCount={searchResults?.totalCount ?? 0}
          searchTerm={debouncedSearchTerm}
          isLoading={searchResults === undefined}
          onResultClick={handleSearchResultClick}
          isAdmin={isAdmin}
          readStats={readStats ?? undefined}
        />

        <SharedDialogs
          selectedDocumentId={selectedDocumentId}
          isDetailOpen={isDetailOpen}
          setIsDetailOpen={setIsDetailOpen}
          isAdmin={isAdmin}
          currentUserId={currentUser?._id}
          handleReplaceFromDetail={handleReplaceFromDetail}
          handleDeleteFromDetail={handleDeleteFromDetail}
          handlePermissionsFromDetail={handlePermissionsFromDetail}
          replaceTarget={replaceTarget}
          setReplaceTarget={setReplaceTarget}
          docDeleteTarget={docDeleteTarget}
          setDocDeleteTarget={setDocDeleteTarget}
          handleDocumentDeleted={handleDocumentDeleted}
          permissionsTarget={permissionsTarget}
          setPermissionsTarget={setPermissionsTarget}
        />
      </div>
    );
  }

  if (!currentFolderId) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <DocumentSearchToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          fileType={fileType}
          onFileTypeChange={setFileType}
        />

        <div className="flex items-center justify-between">
          <DocumentFolderBreadcrumb />
          {isAdmin && (
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <IconFolderPlus className="mr-2 size-4" />
              New Category
            </Button>
          )}
        </div>

        {topLevelFolders === undefined ? (
          <FolderGridSkeleton />
        ) : topLevelFolders.length === 0 ? (
          <EmptyState
            isAdmin={isAdmin}
            onCreateClick={() => setCreateDialogOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topLevelFolders.map((folder) => (
              <FolderCard
                key={folder._id}
                folderId={folder._id}
                name={folder.name}
                itemCount={getItemCount(folder._id)}
                isAdmin={isAdmin}
                isRestricted={isFolderRestricted(folder)}
                onFolderClick={handleFolderClick}
                onFolderRename={handleFolderRename}
                onFolderDelete={handleFolderDelete}
                onFolderPermissions={handleFolderPermissions}
              />
            ))}
          </div>
        )}

        <FolderCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {renameTarget && (
          <FolderRenameDialog
            open={!!renameTarget}
            onOpenChange={(open) => !open && setRenameTarget(null)}
            folderId={renameTarget.id}
            currentName={renameTarget.name}
          />
        )}

        {deleteTarget && (
          <FolderDeleteDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            folderId={deleteTarget.id}
            folderName={deleteTarget.name}
          />
        )}

        {permissionsTarget && (
          <PermissionsPanel
            open={!!permissionsTarget}
            onOpenChange={(open) => !open && setPermissionsTarget(null)}
            targetType={permissionsTarget.type}
            targetId={permissionsTarget.id}
            targetName={permissionsTarget.name}
            folderId={permissionsTarget.folderId}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <DocumentSearchToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        fileType={fileType}
        onFileTypeChange={setFileType}
      />

      <div className="flex items-center justify-between">
        <DocumentFolderBreadcrumb folderId={currentFolderId} />
        <div className="flex items-center gap-2">
          {currentFolderId && (
            <Button
              size="sm"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Upload className="mr-2 size-4" />
              Upload
            </Button>
          )}
          {canCreateSubfolder && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateDialogOpen(true)}
            >
              <IconFolderPlus className="mr-2 size-4" />
              New Subfolder
            </Button>
          )}
        </div>
      </div>

      {fileType && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            Filtered by: {FILE_TYPE_LABELS[fileType] ?? fileType}
            <button
              type="button"
              onClick={() => setFileType("")}
              className="ml-1 rounded-sm hover:bg-accent"
              aria-label="Clear filter"
            >
              <X className="size-3" />
            </button>
          </Badge>
        </div>
      )}

      {folderContents === undefined ? (
        <FolderGridSkeleton />
      ) : (
        <>
          {folderContents.subfolders.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {folderContents.subfolders.map((folder) => (
                <FolderCard
                  key={folder._id}
                  folderId={folder._id}
                  name={folder.name}
                  itemCount={getItemCount(folder._id)}
                  isAdmin={isAdmin}
                  isRestricted={isFolderRestricted(folder)}
                  onFolderClick={handleFolderClick}
                  onFolderRename={handleFolderRename}
                  onFolderDelete={handleFolderDelete}
                  onFolderPermissions={handleFolderPermissions}
                />
              ))}
            </div>
          )}

          {folderContents.documents.length > 0 && (
            <div className="space-y-1">
              {folderContents.documents.map((doc) => {
                const stats = readStats?.[doc._id];
                return (
                  <DocumentCard
                    key={doc._id}
                    document={doc}
                    isAdmin={isAdmin}
                    canManage={canManageDoc(doc.ownerId)}
                    onViewDetails={handleViewDetails}
                    onReplace={handleReplaceFromCard}
                    onDelete={handleDeleteFromCard}
                    readCount={stats?.uniqueReaders}
                    totalAccess={stats?.totalWithAccess}
                  />
                );
              })}
            </div>
          )}

          {folderContents.subfolders.length === 0 &&
            folderContents.documents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <IconFolders className="mb-3 size-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {fileType
                    ? `No ${FILE_TYPE_LABELS[fileType]?.toLowerCase() ?? fileType} documents in this folder.`
                    : "This folder is empty."}
                </p>
                {!fileType && (
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <Upload className="mr-2 size-4" />
                    Upload Document
                  </Button>
                )}
              </div>
            )}
        </>
      )}

      <FolderCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentId={currentFolderId}
      />

      {renameTarget && (
        <FolderRenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          folderId={renameTarget.id}
          currentName={renameTarget.name}
        />
      )}

      {deleteTarget && (
        <FolderDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          folderId={deleteTarget.id}
          folderName={deleteTarget.name}
        />
      )}

      {currentFolderId && (
        <UploadDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          folderId={currentFolderId}
          folderName={currentFolderName}
        />
      )}

      <SharedDialogs
        selectedDocumentId={selectedDocumentId}
        isDetailOpen={isDetailOpen}
        setIsDetailOpen={setIsDetailOpen}
        isAdmin={isAdmin}
        currentUserId={currentUser?._id}
        handleReplaceFromDetail={handleReplaceFromDetail}
        handleDeleteFromDetail={handleDeleteFromDetail}
        handlePermissionsFromDetail={handlePermissionsFromDetail}
        replaceTarget={replaceTarget}
        setReplaceTarget={setReplaceTarget}
        docDeleteTarget={docDeleteTarget}
        setDocDeleteTarget={setDocDeleteTarget}
        handleDocumentDeleted={handleDocumentDeleted}
        permissionsTarget={permissionsTarget}
        setPermissionsTarget={setPermissionsTarget}
      />
    </div>
  );
}

function SharedDialogs({
  selectedDocumentId,
  isDetailOpen,
  setIsDetailOpen,
  isAdmin,
  currentUserId,
  handleReplaceFromDetail,
  handleDeleteFromDetail,
  handlePermissionsFromDetail,
  replaceTarget,
  setReplaceTarget,
  docDeleteTarget,
  setDocDeleteTarget,
  handleDocumentDeleted,
  permissionsTarget,
  setPermissionsTarget,
}: {
  selectedDocumentId: Id<"documents"> | null;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  isAdmin: boolean;
  currentUserId?: Id<"users">;
  handleReplaceFromDetail: (docId: Id<"documents">, docName: string) => void;
  handleDeleteFromDetail: (docId: Id<"documents">, docName: string) => void;
  handlePermissionsFromDetail: (
    docId: Id<"documents">,
    docName: string,
    folderId: string,
  ) => void;
  replaceTarget: { id: Id<"documents">; name: string } | null;
  setReplaceTarget: (target: { id: Id<"documents">; name: string } | null) => void;
  docDeleteTarget: { id: Id<"documents">; name: string } | null;
  setDocDeleteTarget: (target: { id: Id<"documents">; name: string } | null) => void;
  handleDocumentDeleted: () => void;
  permissionsTarget: {
    type: "folder" | "document";
    id: string;
    name: string;
    folderId?: string;
  } | null;
  setPermissionsTarget: (
    target: {
      type: "folder" | "document";
      id: string;
      name: string;
      folderId?: string;
    } | null,
  ) => void;
}) {
  return (
    <>
      <DocumentDetail
        documentId={selectedDocumentId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onReplace={handleReplaceFromDetail}
        onDelete={handleDeleteFromDetail}
        onPermissions={handlePermissionsFromDetail}
      />

      {replaceTarget && (
        <ReplaceFileDialog
          open={!!replaceTarget}
          onOpenChange={(open) => !open && setReplaceTarget(null)}
          documentId={replaceTarget.id}
          documentName={replaceTarget.name}
        />
      )}

      {docDeleteTarget && (
        <DocumentDeleteDialog
          open={!!docDeleteTarget}
          onOpenChange={(open) => !open && setDocDeleteTarget(null)}
          documentId={docDeleteTarget.id}
          documentName={docDeleteTarget.name}
          onDeleted={handleDocumentDeleted}
        />
      )}

      {permissionsTarget && (
        <PermissionsPanel
          open={!!permissionsTarget}
          onOpenChange={(open) => !open && setPermissionsTarget(null)}
          targetType={permissionsTarget.type}
          targetId={permissionsTarget.id}
          targetName={permissionsTarget.name}
          folderId={permissionsTarget.folderId}
        />
      )}
    </>
  );
}

function FolderGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
          <Skeleton className="size-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  isAdmin,
  onCreateClick,
}: {
  isAdmin: boolean;
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <IconFolders className="mb-3 size-12 text-muted-foreground/50" />
      <h3 className="mb-1 font-medium">No document categories yet</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {isAdmin
          ? "Create your first document category to get started."
          : "No document categories have been created yet."}
      </p>
      {isAdmin && (
        <Button size="sm" onClick={onCreateClick}>
          <IconFolderPlus className="mr-2 size-4" />
          New Category
        </Button>
      )}
    </div>
  );
}
