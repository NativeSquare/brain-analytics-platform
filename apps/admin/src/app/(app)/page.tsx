"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

import { Skeleton } from "@/components/ui/skeleton";
import { TodayEventsWidget } from "@/components/homepage/TodayEventsWidget";
import { NextMatchWidget } from "@/components/homepage/NextMatchWidget";
import { QuickAccessCards } from "@/components/homepage/QuickAccessCards";
import { DashboardPlaceholderCards } from "@/components/homepage/DashboardPlaceholderCards";

export default function HomePage() {
  const user = useQuery(api.table.admin.currentAdmin);

  // Loading state
  if (user === undefined) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Section 1: Welcome heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Section 2: Today's Events + Next Match */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TodayEventsWidget />
        <NextMatchWidget />
      </div>

      {/* Section 3: Quick Access */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Quick Access</h2>
        <QuickAccessCards />
      </div>

      {/* Section 4: Dashboards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Dashboards</h2>
        <DashboardPlaceholderCards />
      </div>
    </div>
  );
}
