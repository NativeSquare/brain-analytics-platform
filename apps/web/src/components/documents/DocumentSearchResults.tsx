"use client";

import * as React from "react";
import { format } from "date-fns";
import { SearchX } from "lucide-react";

import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Skeleton } from "@/components/ui/skeleton";
import { getDocumentIcon } from "./documentIcons";
import { ReadTrackerDetail } from "./ReadTrackerDetail";
import { Progress } from "@/components/ui/progress";

// Type for enriched search result from the backend
export interface DocumentSearchResult {
  _id: string;
  name: string;
  extension?: string;
  storageId?: string;
  videoUrl?: string;
  fileSize?: number;
  folderId: string;
  folderPath: string;
  createdAt: number;
}

interface DocumentSearchResultsProps {
  results: DocumentSearchResult[];
  totalCount: number;
  searchTerm: string;
  isLoading: boolean;
  onResultClick: (result: DocumentSearchResult) => void;
  isAdmin: boolean;
  readStats?: Record<
    string,
    {
      uniqueReaders: number;
      totalWithAccess: number;
    }
  >;
}

function HighlightedName({
  name,
  searchTerm,
}: {
  name: string;
  searchTerm: string;
}) {
  if (!searchTerm) return <span>{name}</span>;

  const index = name.toLowerCase().indexOf(searchTerm.toLowerCase());
  if (index === -1) return <span>{name}</span>;

  return (
    <span>
      {name.slice(0, index)}
      <mark className="bg-yellow-100 dark:bg-yellow-900/30 font-semibold rounded px-0.5">
        {name.slice(index, index + searchTerm.length)}
      </mark>
      {name.slice(index + searchTerm.length)}
    </span>
  );
}

function ResultCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
      <Skeleton className="size-4 shrink-0 rounded" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultCard — memoized to prevent unnecessary re-renders in the list
// Follows the same React.memo pattern as FolderCard and DocumentCard.
// ---------------------------------------------------------------------------

interface ResultCardProps {
  result: DocumentSearchResult;
  searchTerm: string;
  isAdmin: boolean;
  stats?: { uniqueReaders: number; totalWithAccess: number };
  onResultClick: (result: DocumentSearchResult) => void;
}

const ResultCard = React.memo(function ResultCard({
  result,
  searchTerm,
  isAdmin,
  stats,
  onResultClick,
}: ResultCardProps) {
  const Icon = getDocumentIcon(result);
  const progressPct =
    stats && stats.totalWithAccess > 0
      ? Math.round((stats.uniqueReaders / stats.totalWithAccess) * 100)
      : 0;

  const handleClick = React.useCallback(() => {
    onResultClick(result);
  }, [onResultClick, result]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onResultClick(result);
      }
    },
    [onResultClick, result],
  );

  const handleStopPropagation = React.useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent/50 cursor-pointer group"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />

      <div className="flex-1 min-w-0">
        <div className="truncate text-sm">
          <HighlightedName name={result.name} searchTerm={searchTerm} />
        </div>
        {result.folderPath && (
          <div className="truncate text-xs text-muted-foreground">
            {result.folderPath}
          </div>
        )}
      </div>

      {/* Read tracking indicator — admin only */}
      {isAdmin && stats && (
        <ReadTrackerDetail
          documentId={result._id as Id<"documents">}
          trigger={
            <button
              type="button"
              className="flex items-center gap-1.5 shrink-0 cursor-pointer rounded px-1.5 py-0.5 hover:bg-accent"
              onClick={handleStopPropagation}
            >
              <Progress value={progressPct} className="h-1.5 w-12" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Opened by {stats.uniqueReaders}/{stats.totalWithAccess}
              </span>
            </button>
          }
        />
      )}

      <span className="shrink-0 text-xs text-muted-foreground">
        {format(new Date(result.createdAt), "dd/MM/yyyy")}
      </span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// DocumentSearchResults — memoized to avoid re-rendering when parent state
// (e.g. dialog open/close) changes without affecting search data.
// ---------------------------------------------------------------------------

export const DocumentSearchResults = React.memo(function DocumentSearchResults({
  results,
  totalCount,
  searchTerm,
  isLoading,
  onResultClick,
  isAdmin,
  readStats,
}: DocumentSearchResultsProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <ResultCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <SearchX className="mb-3 size-12 text-muted-foreground/50" />
        <p className="text-sm font-medium">
          No documents found matching &apos;{searchTerm}&apos;
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different search term or check your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {results.map((result) => (
        <ResultCard
          key={result._id}
          result={result}
          searchTerm={searchTerm}
          isAdmin={isAdmin}
          stats={readStats?.[result._id]}
          onResultClick={onResultClick}
        />
      ))}

      {/* Cap indicator */}
      {totalCount > results.length && (
        <div className="px-3 py-2 text-center text-xs text-muted-foreground">
          Showing {results.length} of {totalCount} results
        </div>
      )}
    </div>
  );
});
