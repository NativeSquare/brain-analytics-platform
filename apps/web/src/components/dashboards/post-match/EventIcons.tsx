"use client";

import React, { useMemo } from "react";
import { HelpCircle } from "lucide-react";
import type { PlayerData, EventDetail } from "./types";

// ---------- Simple icon event type renderer ----------

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

interface EventIconProps {
  type: "goal" | "yellow_card" | "red_card" | "substitution" | string;
  size?: number;
  minute?: number;
}

/** Renders a single event icon for a given event type. */
export function EventIcon({ type, size = 16, minute }: EventIconProps) {
  const icon = (() => {
    switch (type) {
      case "goal":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            aria-label="Goal"
            role="img"
          >
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="3" fill="currentColor" />
          </svg>
        );
      case "own_goal":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            aria-label="Own Goal"
            role="img"
          >
            <circle cx="8" cy="8" r="7" fill="none" stroke="#dc2626" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="3" fill="#dc2626" />
          </svg>
        );
      case "assist":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            aria-label="Assist"
            role="img"
          >
            <circle cx="8" cy="8" r="7" fill="none" stroke="#16a34a" strokeWidth="1.5" />
            <text x="8" y="12" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="bold">A</text>
          </svg>
        );
      case "yellow_card":
      case "yellow":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            aria-label="Yellow Card"
            role="img"
          >
            <rect x="4" y="2" width="8" height="12" rx="1" fill="#facc15" stroke="#a16207" strokeWidth="0.5" />
          </svg>
        );
      case "red_card":
      case "red":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            aria-label="Red Card"
            role="img"
          >
            <rect x="4" y="2" width="8" height="12" rx="1" fill="#dc2626" stroke="#991b1b" strokeWidth="0.5" />
          </svg>
        );
      case "substitution":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            aria-label="Substitution"
            role="img"
          >
            <path d="M4 4 L8 8 L4 12" fill="none" stroke="#16a34a" strokeWidth="2" />
            <path d="M12 4 L8 8 L12 12" fill="none" stroke="#dc2626" strokeWidth="2" />
          </svg>
        );
      default:
        return <HelpCircle size={size} aria-label={`Event: ${type}`} />;
    }
  })();

  return (
    <span className="inline-flex items-center gap-0.5">
      {icon}
      {minute !== undefined && (
        <span className="text-[10px] text-muted-foreground">{minute}&apos;</span>
      )}
    </span>
  );
}

// ---------- Player-level event icons (used in lineup/sub tables) ----------

interface PlayerEventIconsProps {
  player: PlayerData;
}

/**
 * Renders all event icons for a single player: goals, assists, own goals, cards.
 * Ported from the SOURCE EventIcons component but without video functionality.
 */
export function PlayerEventIcons({ player }: PlayerEventIconsProps) {
  const events = useMemo(() => {
    const merged: Array<{ detail: EventDetail; type: string }> = [];

    if (player.GoalEvents?.length) {
      player.GoalEvents.forEach((d) => merged.push({ detail: d, type: "goal" }));
    } else if (player.Goals?.length) {
      player.Goals.forEach((minute, idx) => {
        const m = toNumber(minute) ?? 0;
        merged.push({ detail: { minute: m, event_id: -100000 - idx, timestamp: null, period: null }, type: "goal" });
      });
    }

    if (player.AssistEvents?.length) {
      player.AssistEvents.forEach((d) => merged.push({ detail: d, type: "assist" }));
    } else if (player.Assists?.length) {
      player.Assists.forEach((minute, idx) => {
        const m = toNumber(minute) ?? 0;
        merged.push({ detail: { minute: m, event_id: -200000 - idx, timestamp: null, period: null }, type: "assist" });
      });
    }

    if (player.OwnGoalEvents?.length) {
      player.OwnGoalEvents.forEach((d) => merged.push({ detail: d, type: "own_goal" }));
    } else if (player.OwnGoals?.length) {
      player.OwnGoals.forEach((minute, idx) => {
        const m = toNumber(minute) ?? 0;
        merged.push({ detail: { minute: m, event_id: -300000 - idx, timestamp: null, period: null }, type: "own_goal" });
      });
    }

    if (player.YellowCardEvents?.length) {
      player.YellowCardEvents.forEach((d) => merged.push({ detail: d, type: "yellow_card" }));
    } else if (player.YellowCards?.length) {
      player.YellowCards.forEach((minute, idx) => {
        const m = toNumber(minute) ?? 0;
        merged.push({ detail: { minute: m, event_id: -400000 - idx, timestamp: null, period: null }, type: "yellow_card" });
      });
    }

    if (player.RedCardEvents?.length) {
      player.RedCardEvents.forEach((d) => merged.push({ detail: d, type: "red_card" }));
    } else if (player.RedCards?.length) {
      player.RedCards.forEach((minute, idx) => {
        const m = toNumber(minute) ?? 0;
        merged.push({ detail: { minute: m, event_id: -500000 - idx, timestamp: null, period: null }, type: "red_card" });
      });
    }

    merged.sort((a, b) => a.detail.minute - b.detail.minute);
    return merged;
  }, [player]);

  if (events.length === 0) return null;

  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      {events.map((e, i) => (
        <EventIcon
          key={`${e.detail.event_id}-${e.type}-${i}`}
          type={e.type}
          size={14}
          minute={e.detail.minute}
        />
      ))}
    </span>
  );
}

export default EventIcon;
