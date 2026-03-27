"use client";

import * as React from "react";
import { format } from "date-fns";
import { MoreHorizontal, Eye, Replace, Trash2 } from "lucide-react";

import { formatFileSize } from "@packages/shared/documents";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDocumentIcon } from "./documentIcons";

interface DocumentData {
  _id: string;
  name: string;
  extension?: string;
  storageId?: string;
  videoUrl?: string;
  fileSize?: number;
  createdAt: number;
}

interface DocumentCardProps {
  document: DocumentData;
  isAdmin: boolean;
  onViewDetails: (docId: string) => void;
  onReplace: (docId: string, docName: string) => void;
  onDelete: (docId: string, docName: string) => void;
}

export const DocumentCard = React.memo(function DocumentCard({
  document,
  isAdmin,
  onViewDetails,
  onReplace,
  onDelete,
}: DocumentCardProps) {
  const isFile = !!document.storageId;

  const handleViewDetails = React.useCallback(() => {
    onViewDetails(document._id);
  }, [onViewDetails, document._id]);

  const handleReplace = React.useCallback(() => {
    onReplace(document._id, document.name);
  }, [onReplace, document._id, document.name]);

  const handleDelete = React.useCallback(() => {
    onDelete(document._id, document.name);
  }, [onDelete, document._id, document.name]);

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50 cursor-pointer group"
      onClick={handleViewDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleViewDetails();
        }
      }}
    >
      {React.createElement(getDocumentIcon(document), {
        className: "size-4 shrink-0 text-muted-foreground",
      })}
      <span className="flex-1 truncate text-sm">{document.name}</span>

      {isFile && document.fileSize != null ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatFileSize(document.fileSize)}
        </span>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">
          Video Link
        </span>
      )}

      <span className="shrink-0 text-xs text-muted-foreground">
        {format(new Date(document.createdAt), "MMM d, yyyy")}
      </span>

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails();
              }}
            >
              <Eye className="mr-2 size-4" />
              View Details
            </DropdownMenuItem>
            {isFile && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleReplace();
                }}
              >
                <Replace className="mr-2 size-4" />
                Replace File
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});
