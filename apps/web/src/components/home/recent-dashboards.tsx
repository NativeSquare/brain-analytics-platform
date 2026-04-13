"use client";

import { createElement, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { IconArrowRight, IconLayoutGrid } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardIcon } from "@/lib/dashboard-icons";
import { useTranslation } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecentDashboards() {
  const { t } = useTranslation();
  const { isAuthenticated } = useConvexAuth();
  const recentEntries = useQuery(
    api.userDashboards.getUserRecentDashboards,
    isAuthenticated ? { limit: 5 } : "skip",
  );
  const allDashboards = useQuery(
    api.dashboards.queries.getDashboardsForRole,
    isAuthenticated ? {} : "skip",
  );

  // Build a map slug -> dashboard for quick lookup
  type Dashboard = NonNullable<typeof allDashboards>[number];
  const dashboardBySlug = useMemo(() => {
    if (!allDashboards) return new Map<string, Dashboard>();
    const map = new Map<string, Dashboard>();
    for (const d of allDashboards) {
      map.set(d.slug, d);
    }
    return map;
  }, [allDashboards]);

  const isLoading =
    recentEntries === undefined || allDashboards === undefined;

  const items = useMemo(() => {
    if (!recentEntries || !allDashboards) return [];
    return recentEntries
      .map((entry) => {
        const dashboard = dashboardBySlug.get(entry.dashboardId);
        if (!dashboard) return null;
        return { ...dashboard, openedAt: entry.openedAt };
      })
      .filter(Boolean) as Array<Dashboard & { openedAt: number }>;
  }, [recentEntries, allDashboards, dashboardBySlug]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <IconLayoutGrid
            className="size-5 text-primary"
            aria-hidden="true"
          />
          {t.home.recentDashboards}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 rounded-full bg-muted p-3">
              <IconLayoutGrid
                className="size-6 text-muted-foreground/40"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.home.noRecentDashboards}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const iconElement = createElement(getDashboardIcon(item.icon), {
                className: "size-4",
              });
              return (
                <li key={item.slug}>
                  <Link
                    href={`/dashboards/${item.slug}`}
                    className="group flex items-center justify-between rounded-xl border p-3 transition-all hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        {iconElement}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(item.openedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <IconArrowRight
                      className="size-3.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <div className="p-6 pt-0">
        <Button asChild className="w-full justify-between" variant="outline">
          <Link href="/dashboards">
            {t.home.openDashboards}
            <IconArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
