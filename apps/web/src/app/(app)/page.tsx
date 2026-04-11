"use client";

import { MatchCountdown } from "@/components/home/match-countdown";
import { RecentResults } from "@/components/home/recent-results";
import { UpcomingFixtures } from "@/components/home/upcoming-fixtures";
import { RecentDashboards } from "@/components/home/recent-dashboards";
import { PinnedDashboards } from "@/components/home/pinned-dashboards";
import { QuickAccessCards } from "@/components/home/quick-access-cards";
import { useTranslation } from "@/hooks/useTranslation";

export default function AppHomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col space-y-6 py-4 md:py-6">
      {/* Hero: Next match countdown */}
      <section className="px-4 lg:px-6">
        <MatchCountdown />
      </section>

      {/* Match data: Recent results + Upcoming fixtures */}
      <section className="grid grid-cols-1 gap-6 px-4 md:grid-cols-2 lg:px-6">
        <RecentResults />
        <UpcomingFixtures />
      </section>

      {/* Dashboards: Recent + Pinned */}
      <section className="grid grid-cols-1 gap-6 px-4 md:grid-cols-2 lg:px-6">
        <RecentDashboards />
        <PinnedDashboards />
      </section>

      {/* Quick access navigation */}
      <section className="px-4 lg:px-6">
        <h2 className="mb-4 text-lg font-semibold">{t.home.quickAccess}</h2>
        <QuickAccessCards />
      </section>
    </div>
  );
}
