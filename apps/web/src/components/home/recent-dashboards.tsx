"use client";

import { createElement, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { IconArrowRight, IconClock } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardIcon } from "@/lib/dashboard-icons";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecentDashboards() {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconClock
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          Recent Dashboards
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recently viewed dashboards
          </p>
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
                    className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      {iconElement}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(item.openedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <IconArrowRight
                      className="size-4 text-primary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/dashboards">Browse dashboards</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
