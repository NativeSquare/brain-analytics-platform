"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconLayoutGrid,
  IconReportAnalytics,
  IconChartBar,
} from "@tabler/icons-react";

import { useTranslation } from "@/hooks/useTranslation";

// ---------------------------------------------------------------------------
// Fixed dashboard shortcuts — matches original BrainAnalytics homepage
// ---------------------------------------------------------------------------

const SHORTCUTS = [
  {
    slug: "post-match",
    icon: IconReportAnalytics,
    titleKey: "postMatch" as const,
    descKey: "postMatchDesc" as const,
  },
  {
    slug: "season-overview",
    icon: IconChartBar,
    titleKey: "seasonOverview" as const,
    descKey: "seasonOverviewDesc" as const,
  },
] as const;

export function QuickAccessCards() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SHORTCUTS.map((shortcut) => {
        const Icon = shortcut.icon;
        return (
          <Link
            key={shortcut.slug}
            href={`/dashboards/${shortcut.slug}`}
            className="group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">
                {t.home[shortcut.titleKey]}
              </h3>
              <p className="truncate text-[10px] text-muted-foreground">
                {t.home[shortcut.descKey]}
              </p>
            </div>
            <IconArrowRight
              className="ml-auto size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </Link>
        );
      })}
      <Link
        href="/dashboards"
        className="group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-md"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
          <IconLayoutGrid className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold">
            {t.home.openDashboards}
          </h3>
          <p className="truncate text-[10px] text-muted-foreground">
            {t.home.browseDashboards}
          </p>
        </div>
        <IconArrowRight
          className="ml-auto size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
