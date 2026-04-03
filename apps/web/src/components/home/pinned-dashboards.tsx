"use client";

import { createElement, useMemo } from "react";
import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { IconPin } from "@tabler/icons-react";

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

export function PinnedDashboards() {
  const { isAuthenticated } = useConvexAuth();
  const pinnedEntries = useQuery(
    api.userDashboards.getUserPinnedDashboards,
    isAuthenticated ? {} : "skip",
  );
  const allDashboards = useQuery(
    api.dashboards.queries.getDashboardsForRole,
    isAuthenticated ? {} : "skip",
  );

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
    pinnedEntries === undefined || allDashboards === undefined;

  const items = useMemo(() => {
    if (!pinnedEntries || !allDashboards) return [];
    return pinnedEntries
      .map((entry) => {
        const dashboard = dashboardBySlug.get(entry.dashboardId);
        if (!dashboard) return null;
        return dashboard;
      })
      .filter(Boolean) as Dashboard[];
  }, [pinnedEntries, allDashboards, dashboardBySlug]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconPin
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          Pinned Dashboards
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
            No pinned dashboards yet
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const iconElement = createElement(getDashboardIcon(item.icon), {
                className: "size-4 text-primary",
              });
              return (
                <li key={item.slug}>
                  <Link
                    href={`/dashboards/${item.slug}`}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                  >
                    <div className="rounded-md bg-primary/15 p-1.5">
                      {iconElement}
                    </div>
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href="/dashboards"
          className="text-sm font-medium text-primary hover:underline"
        >
          Browse dashboards &rarr;
        </Link>
      </CardFooter>
    </Card>
  );
}
