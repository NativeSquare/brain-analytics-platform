"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Stethoscope } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SquadAvailabilityCard from "./SquadAvailabilityCard";
import UpcomingReturnsCard from "./UpcomingReturnsCard";
import CurrentlyInjuredTable from "./CurrentlyInjuredTable";
import InjuryByRegionChart from "./InjuryByRegionChart";
import InjuryByTypeChart from "./InjuryByTypeChart";

/**
 * Medical Overview dashboard.
 * Story 14.3 AC #8, #16, #17: Dashboard layout with 5 widgets.
 * Story 14.3 Part B: Connected to real Convex data.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MedicalOverview({ slug }: { slug: string }) {
  const data = useQuery(api.injuries.queries.getMedicalDashboardData, {});

  // Loading state
  if (data === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Medical Overview</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="md:col-span-2 h-40 w-full rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // null = unauthorized
  if (data === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Medical Overview</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          You do not have permission to view the medical dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Stethoscope className="size-6 text-primary" />
        <h1 className="text-2xl font-semibold">Medical Overview</h1>
      </div>

      {/* Top row: Squad Availability (1/3) + Upcoming Returns (2/3) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SquadAvailabilityCard data={data.squadAvailability} />
        <div className="md:col-span-2">
          <UpcomingReturnsCard data={data.upcomingReturns} />
        </div>
      </div>

      {/* Middle row: Currently Injured Players (full width) */}
      <CurrentlyInjuredTable data={data.currentlyInjured} />

      {/* Bottom row: Charts (1/2 + 1/2) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InjuryByRegionChart data={data.injuryByRegion} />
        <InjuryByTypeChart data={data.injuryByType} />
      </div>
    </div>
  );
}
