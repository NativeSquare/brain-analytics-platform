"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { IconFolderPlus, IconFolders, IconFile } from "@tabler/icons-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderCard } from "@/components/documents/FolderCard";
import { FolderCreateDialog } from "@/components/documents/FolderCreateDialog";
import { FolderRenameDialog } from "@/components/documents/FolderRenameDialog";
import { FolderDeleteDialog } from "@/components/documents/FolderDeleteDialog";
import { DocumentFolderBreadcrumb } from "@/components/documents/DocumentFolderBreadcrumb";

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentFolderId = searchParams.get("folder") as Id<"folders"> | null;

  // Current user for role check
  const currentUser = useQuery(api.table.users.currentUser);
  const isAdmin = currentUser?.role === "admin";

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<{
    id: Id<"folders">;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: Id<"folders">;
    name: string;
  } | null>(null);

  // Data queries
  const topLevelFolders = useQuery(
    api.documents.queries.getFolders,
    !currentFolderId ? {} : "skip",
  );

  const folderContents = useQuery(
    api.documents.queries.getFolderContents,
    currentFolderId ? { folderId: currentFolderId } : "skip",
  );

  // Build folder IDs for batch item count
  const visibleFolderIds = React.useMemo(() => {
    if (!currentFolderId && topLevelFolders) {
      return topLevelFolders.map((f) => f._id);
    }
    if (currentFolderId && folderContents?.subfolders) {
      return folderContents.subfolders.map((f) => f._id);
    }
    return [];
  }, [currentFolderId, topLevelFolders, folderContents]);

  const itemCounts = useQuery(
    api.documents.queries.getFolderItemCounts,
    visibleFolderIds.length > 0 ? { folderIds: visibleFolderIds } : "skip",
  );

  // Stable callbacks for FolderCard (memoized to avoid re-renders)
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

  function getItemCount(folderId: Id<"folders">): number {
    if (!itemCounts) return 0;
    const counts = itemCounts[folderId];
    return counts ? counts.subfolders + counts.documents : 0;
  }

  // Determine if we can show "New Subfolder" button
  // Only show when inside a top-level category (folder's parentId is undefined)
  const canCreateSubfolder =
    isAdmin &&
    currentFolderId &&
    folderContents?.folder &&
    folderContents.folder.parentId === undefined;

  // Top-level view
  if (!currentFolderId) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
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
                onFolderClick={handleFolderClick}
                onFolderRename={handleFolderRename}
                onFolderDelete={handleFolderDelete}
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
      </div>
    );
  }

  // Folder contents view
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <DocumentFolderBreadcrumb folderId={currentFolderId} />
        {canCreateSubfolder && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <IconFolderPlus className="mr-2 size-4" />
            New Subfolder
          </Button>
        )}
      </div>

      {folderContents === undefined ? (
        <FolderGridSkeleton />
      ) : (
        <>
          {/* Subfolders */}
          {folderContents.subfolders.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {folderContents.subfolders.map((folder) => (
                <FolderCard
                  key={folder._id}
                  folderId={folder._id}
                  name={folder.name}
                  itemCount={getItemCount(folder._id)}
                  isAdmin={isAdmin}
                  onFolderClick={handleFolderClick}
                  onFolderRename={handleFolderRename}
                  onFolderDelete={handleFolderDelete}
                />
              ))}
            </div>
          )}

          {/* Documents */}
          {folderContents.documents.length > 0 && (
            <div className="space-y-1">
              {folderContents.documents.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50"
                >
                  <IconFile className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{doc.name}</span>
                  {doc.extension && (
                    <span className="text-xs uppercase text-muted-foreground">
                      {doc.extension}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(doc.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {folderContents.subfolders.length === 0 &&
            folderContents.documents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <IconFolders className="mb-3 size-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  This folder is empty.
                </p>
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
    </div>
  );
}

// --- Sub-components ---

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
