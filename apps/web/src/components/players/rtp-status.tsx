"use client";

import { Badge } from "@/components/ui/badge";

/**
 * RTP status configuration for UI rendering.
 * Story 14.3 AC #3, #5: Status dots and badges.
 */
export const RTP_STATUS_CONFIG: Record<
  string,
  { label: string; dotColor: string; badgeClassName: string }
> = {
  active: {
    label: "Active",
    dotColor: "bg-red-500",
    badgeClassName: "",
  },
  current: {
    label: "Active",
    dotColor: "bg-red-500",
    badgeClassName: "",
  },
  rehab: {
    label: "Rehab",
    dotColor: "bg-amber-500",
    badgeClassName:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-transparent",
  },
  assessment: {
    label: "RTP Assessment",
    dotColor: "bg-blue-500",
    badgeClassName:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-transparent",
  },
  cleared: {
    label: "Cleared",
    dotColor: "",
    badgeClassName:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-transparent",
  },
  recovered: {
    label: "Cleared",
    dotColor: "",
    badgeClassName:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-transparent",
  },
};

/**
 * Normalize legacy status values to the new 4-value enum.
 */
export function normalizeRtpStatus(status: string): string {
  if (status === "current") return "active";
  if (status === "recovered") return "cleared";
  return status;
}

/**
 * RTP Status Badge component.
 * Renders a colored Badge for any RTP status value, with backward compat.
 */
export function RtpStatusBadge({ status }: { status: string }) {
  const normalized = normalizeRtpStatus(status);
  const config = RTP_STATUS_CONFIG[normalized] ?? RTP_STATUS_CONFIG.active;
  const isDestructive = normalized === "active";

  return (
    <Badge
      variant={isDestructive ? "destructive" : "outline"}
      className={config.badgeClassName}
    >
      {config.label}
    </Badge>
  );
}

/**
 * Small RTP status dot for player cards.
 * Returns null for cleared/no injury.
 */
export function RtpStatusDot({ status }: { status: string | null }) {
  if (!status) return null;
  const normalized = normalizeRtpStatus(status);
  const config = RTP_STATUS_CONFIG[normalized];
  if (!config || !config.dotColor) return null;

  return (
    <span
      className={`inline-block size-2.5 rounded-full ${config.dotColor}`}
      title={config.label}
    />
  );
}
