"use client";

import * as React from "react";
import { IconDots, IconFolder, IconLock, IconPencil, IconShield, IconTrash } from "@tabler/icons-react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderCardProps {
  folderId: Id<"folders">;
  name: string;
  itemCount: number;
  isAdmin: boolean;
  isRestricted?: boolean;
  onFolderClick: (folderId: Id<"folders">) => void;
  onFolderRename: (folderId: Id<"folders">, name: string) => void;
  onFolderDelete: (folderId: Id<"folders">, name: string) => void;
  onFolderPermissions?: (folderId: Id<"folders">, name: string) => void;
}

export const FolderCard = React.memo(function FolderCard({
  folderId,
  name,
  itemCount,
  isAdmin,
  isRestricted,
  onFolderClick,
  onFolderRename,
  onFolderDelete,
  onFolderPermissions,
}: FolderCardProps) {
  const handleClick = React.useCallback(() => {
    onFolderClick(folderId);
  }, [onFolderClick, folderId]);

  const handleRename = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFolderRename(folderId, name);
    },
    [onFolderRename, folderId, name],
  );

  const handlePermissions = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFolderPermissions?.(folderId, name);
    },
    [onFolderPermissions, folderId, name],
  );

  const handleDelete = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFolderDelete(folderId, name);
    },
    [onFolderDelete, folderId, name],
  );

  return (
    <Card
      className="group relative cursor-pointer transition-colors hover:bg-accent/50"
      onClick={handleClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <IconFolder className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium text-sm">{name}</p>
            {isRestricted && (
              <IconLock className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDots className="size-4" />
                <span className="sr-only">Folder actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRename}>
                <IconPencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePermissions}>
                <IconShield className="mr-2 size-4" />
                Permissions
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <IconTrash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
});
