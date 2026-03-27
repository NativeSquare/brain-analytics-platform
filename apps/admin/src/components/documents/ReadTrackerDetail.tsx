"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReadTrackerDetailProps {
  documentId: Id<"documents">;
  trigger: React.ReactNode;
}

export function ReadTrackerDetail({
  documentId,
  trigger,
}: ReadTrackerDetailProps) {
  const detail = useQuery(api.documents.queries.getReadersDetail, {
    documentId,
  });

  const totalReaders = detail ? detail.readers.length : 0;
  const totalUsers = detail
    ? detail.readers.length + detail.nonReaders.length
    : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {detail === undefined ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-4">
              {/* Header */}
              <h4 className="text-sm font-semibold leading-tight">
                {detail.documentName}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalReaders} of {totalUsers} user
                {totalUsers !== 1 ? "s" : ""} have opened this document
              </p>

              {/* Opened section */}
              {detail.readers.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Opened
                  </p>
                  <div className="space-y-2">
                    {detail.readers.map((reader) => (
                      <div
                        key={reader.userId}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm truncate">
                            {reader.fullName}
                          </span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {reader.role}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(reader.readAt), "MMM d, yyyy 'at' HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Separator between sections */}
              {detail.readers.length > 0 && detail.nonReaders.length > 0 && (
                <Separator className="my-3" />
              )}

              {/* Not yet opened section */}
              {detail.nonReaders.length > 0 && (
                <div className={detail.readers.length === 0 ? "mt-3" : ""}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Not yet opened
                  </p>
                  <div className="space-y-2">
                    {detail.nonReaders.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <span className="text-sm truncate">
                          {user.fullName}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No readers at all */}
              {detail.readers.length === 0 && detail.nonReaders.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  No one has opened this document yet.
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
