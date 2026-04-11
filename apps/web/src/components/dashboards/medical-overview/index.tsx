"use client";

import { Stethoscope } from "lucide-react";
import SquadAvailabilityCard from "./SquadAvailabilityCard";
import UpcomingReturnsCard from "./UpcomingReturnsCard";
import CurrentlyInjuredTable from "./CurrentlyInjuredTable";
import InjuryByRegionChart from "./InjuryByRegionChart";
import InjuryByTypeChart from "./InjuryByTypeChart";

/**
 * Medical Overview dashboard.
 * Story 14.3 AC #8, #16, #17: Dashboard layout with 5 widgets.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MedicalOverview({ slug }: { slug: string }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Stethoscope className="size-6 text-primary" />
        <h1 className="text-2xl font-semibold">Medical Overview</h1>
      </div>

      {/* Top row: Squad Availability (1/3) + Upcoming Returns (2/3) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SquadAvailabilityCard />
        <div className="md:col-span-2">
          <UpcomingReturnsCard />
        </div>
      </div>

      {/* Middle row: Currently Injured Players (full width) */}
      <CurrentlyInjuredTable />

      {/* Bottom row: Charts (1/2 + 1/2) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InjuryByRegionChart />
        <InjuryByTypeChart />
      </div>
    </div>
  );
}
