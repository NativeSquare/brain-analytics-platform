"use client";

import { MatchCountdown } from "@/components/home/match-countdown";
import { RecentResults } from "@/components/home/recent-results";
import { RecentDashboards } from "@/components/home/recent-dashboards";
import { RecentDocuments } from "@/components/home/recent-documents";
import { TodayEventsCard } from "@/components/home/today-events-card";
import { QuickAccessCards } from "@/components/home/quick-access-cards";

export default function AppHomePage() {
  return (
    <div className="flex flex-col space-y-6 py-4 md:py-6">
      {/* Row 1: Dashboard shortcuts */}
      <section className="px-4 lg:px-6">
        <QuickAccessCards />
      </section>

      {/* Row 2: Next match countdown */}
      <section className="px-4 lg:px-6">
        <MatchCountdown />
      </section>

      {/* Row 3: Today events (left) + Results (right) */}
      <section className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:px-6">
        <TodayEventsCard />
        <RecentResults />
      </section>

      {/* Row 4: Dashboards (left) + Documents (right) */}
      <section className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:px-6">
        <RecentDashboards />
        <RecentDocuments />
      </section>
    </div>
  );
}
