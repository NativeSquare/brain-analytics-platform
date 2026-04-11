"use client";

import * as React from "react";
import { useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import type { Doc } from "@packages/backend/convex/_generated/dataModel";
import {
  BODY_REGION_LABELS,
  INJURY_STATUS_LABELS,
  INJURY_SEVERITY_LABELS,
  LEGACY_STATUS_MAP,
} from "@packages/shared/injuries";
import type {
  BodyRegion,
  InjuryStatus,
  InjurySeverity,
} from "@packages/shared/injuries";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import { RehabNotesSection } from "./RehabNotesSection";

type PlayerInjury = Doc<"playerInjuries">;

interface InjuryTimelineProps {
  injuries: PlayerInjury[];
}

// ---------------------------------------------------------------------------
// Severity color maps (AC #3 — green/amber/red)
// ---------------------------------------------------------------------------

const severityDotColor: Record<string, string> = {
  minor: "bg-green-500",
  moderate: "bg-orange-500",
  severe: "bg-red-500",
};

const severityBadgeClass: Record<string, string> = {
  minor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  moderate: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  severe: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusLabel(status: string): string {
  if (status in INJURY_STATUS_LABELS) {
    return INJURY_STATUS_LABELS[status as InjuryStatus];
  }
  const mapped = LEGACY_STATUS_MAP[status];
  if (mapped) return INJURY_STATUS_LABELS[mapped];
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isActiveStatus(status: string): boolean {
  return status !== "cleared" && status !== "recovered";
}

function getDaysOut(
  injuryDate: number,
  clearanceDate?: number
): { days: number; ongoing: boolean } {
  if (clearanceDate) {
    return {
      days: differenceInDays(new Date(clearanceDate), new Date(injuryDate)),
      ongoing: false,
    };
  }
  return {
    days: differenceInDays(new Date(), new Date(injuryDate)),
    ongoing: true,
  };
}

// ---------------------------------------------------------------------------
// Summary stats bar (AC #14)
// ---------------------------------------------------------------------------

function TimelineSummary({ injuries, t }: { injuries: PlayerInjury[]; t: any }) {
  const stats = useMemo(() => {
    const active = injuries.filter((e) => isActiveStatus(e.status));
    const recovered = injuries.filter((e) => !isActiveStatus(e.status));

    const totalDaysLost = injuries.reduce((sum, inj) => {
      const { days } = getDaysOut(inj.date, inj.clearanceDate ?? inj.actualReturnDate);
      return sum + days;
    }, 0);

    const avgRecovery =
      recovered.length > 0
        ? Math.round(
            recovered.reduce((sum, inj) => {
              const { days } = getDaysOut(inj.date, inj.clearanceDate ?? inj.actualReturnDate);
              return sum + days;
            }, 0) / recovered.length
          )
        : null;

    return {
      total: injuries.length,
      totalDaysLost,
      activeCount: active.length,
      avgRecovery,
    };
  }, [injuries]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCard label={t.injuryTimeline.totalInjuries} value={String(stats.total)} />
      <SummaryCard label={t.injuryTimeline.totalDaysLost} value={String(stats.totalDaysLost)} />
      <SummaryCard
        label={t.injuryTimeline.currentlyActive}
        value={String(stats.activeCount)}
        accent={stats.activeCount > 0}
      />
      <SummaryCard
        label={t.injuryTimeline.avgRecovery}
        value={
          stats.avgRecovery !== null
            ? `${stats.avgRecovery} ${t.injuryTimeline.daysOut.replace("{count}", "").trim()}`
            : "N/A"
        }
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="px-3 py-2">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={`text-lg font-semibold ${accent ? "text-destructive" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Timeline component (AC #1, #2, #3, #4)
// ---------------------------------------------------------------------------

export function InjuryTimeline({ injuries }: InjuryTimelineProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (injuries.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t.injuryTimeline.noInjuries}
      </p>
    );
  }

  // Already sorted by date descending from query (most recent first)
  const sorted = injuries;

  return (
    <div className="space-y-6">
      <TimelineSummary injuries={injuries} t={t} />

      <div className="relative space-y-6 pl-8">
        {/* Vertical line */}
        <div className="bg-border absolute left-3 top-0 bottom-0 w-0.5" />

        {sorted.map((injury) => {
          const active = isActiveStatus(injury.status);
          const { days, ongoing } = getDaysOut(
            injury.date,
            injury.clearanceDate ?? injury.actualReturnDate
          );
          const isExpanded = expandedId === injury._id;

          return (
            <div key={injury._id} className="relative">
              {/* Severity-colored dot */}
              <div
                className={cn(
                  "border-background absolute left-[-1.125rem] top-4 h-3 w-3 rounded-full border-2",
                  severityDotColor[injury.severity] ?? "bg-gray-400"
                )}
              />

              {/* Content card */}
              <Card
                className={cn(
                  "cursor-pointer transition-colors",
                  active && "border-l-4 border-l-destructive bg-destructive/5"
                )}
                onClick={() => setExpandedId(isExpanded ? null : injury._id)}
              >
                <CardContent className="p-4">
                  {/* Row 1: Injury type + severity + status badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{injury.injuryType}</span>
                    <Badge
                      variant="outline"
                      className={severityBadgeClass[injury.severity] ?? ""}
                    >
                      {INJURY_SEVERITY_LABELS[injury.severity as InjurySeverity] ??
                        injury.severity}
                    </Badge>
                    {active ? (
                      <Badge variant="destructive">{t.injuryTimeline.active ?? "Active"}</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      >
                        {getStatusLabel(injury.status)}
                      </Badge>
                    )}
                  </div>

                  {/* Row 2: Body region */}
                  {injury.bodyRegion && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {BODY_REGION_LABELS[injury.bodyRegion as BodyRegion] ?? injury.bodyRegion}
                      {injury.side && injury.side !== "na" && (
                        <span> &middot; {injury.side.charAt(0).toUpperCase() + injury.side.slice(1)}</span>
                      )}
                    </p>
                  )}

                  {/* Row 3: Dates */}
                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>
                      {t.injuryTimeline.injuredOn}: {format(new Date(injury.date), "dd/MM/yyyy")}
                    </span>
                    <span>
                      {t.injuryTimeline.expectedReturn}:{" "}
                      {injury.expectedReturnDate
                        ? format(new Date(injury.expectedReturnDate), "dd/MM/yyyy")
                        : t.injuryTimeline.tbd}
                    </span>
                    <span>
                      {t.injuryTimeline.returnedOn}:{" "}
                      {injury.actualReturnDate
                        ? format(new Date(injury.actualReturnDate), "dd/MM/yyyy")
                        : "\u2014"}
                    </span>
                  </div>

                  {/* Row 4: Days out counter */}
                  <p className="mt-1 text-xs font-medium">
                    {days} {t.injuryTimeline.daysOut}
                    {ongoing && ` (${t.injuryTimeline.ongoing})`}
                  </p>
                </CardContent>
              </Card>

              {/* Expanded: Rehab Notes Section */}
              {isExpanded && (
                <div className="mt-2 ml-2">
                  <RehabNotesSection injuryId={injury._id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
