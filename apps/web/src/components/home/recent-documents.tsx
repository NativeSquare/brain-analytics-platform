"use client";

import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  IconFileText,
  IconArrowRight,
  IconFolder,
  IconContract,
} from "@tabler/icons-react";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecentDocuments() {
  const { t } = useTranslation();
  const { isAuthenticated } = useConvexAuth();

  const recentDocs = useQuery(
    api.documents.queries.getRecentlyOpenedDocuments,
    isAuthenticated ? {} : "skip",
  );

  const isLoading = recentDocs === undefined;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <IconFileText
            className="size-5 text-primary"
            aria-hidden="true"
          />
          {t.home.recentDocuments}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : !recentDocs || recentDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 rounded-full bg-muted p-3">
              <IconFileText
                className="size-6 text-muted-foreground/40"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.home.noRecentDocuments}
            </p>
          </div>
        ) : (
          recentDocs.map((doc) => (
            <Link
              key={doc.documentId}
              href={`/documents?id=${doc.documentId}`}
              className="group flex items-center justify-between rounded-xl border p-3 transition-all hover:border-primary/30 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <IconFileText className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(doc.openedAt), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
              <IconArrowRight
                className="size-3.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                aria-hidden="true"
              />
            </Link>
          ))
        )}
      </CardContent>
      <div className="p-6 pt-0">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/documents"
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <IconFolder className="size-5" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold">{t.home.openDocuments}</span>
          </Link>
          <Link
            href="/contracts"
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <IconContract className="size-5" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold">{t.home.openContracts}</span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
