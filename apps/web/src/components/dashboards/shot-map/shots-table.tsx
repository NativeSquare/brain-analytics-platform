"use client";

import { useMemo } from "react";

import type { Shot, MatchOption } from "./types";
import { getMatchMinute } from "./constants";

interface ShotsTableProps {
  shots: Shot[];
  selectedMatch: MatchOption | null;
  selectedTeamId: number | null;
  selectedTeamName: string | null;
  onShotClick?: (eventId: number) => void;
  hoveredShotId?: number | null;
  selectedShotId?: number | null;
}

interface TableRow {
  id: string;
  homeTeamShot: Shot | null;
  awayTeamShot: Shot | null;
  minute: number;
  period: number;
  periodLabel: string;
  homeCumulativeXg: number;
  awayCumulativeXg: number;
}

const getPeriodLabel = (period: number | string | null): string => {
  if (period == null) return "";
  const periodNum = typeof period === "string" ? parseInt(period, 10) : period;
  if (isNaN(periodNum)) return "";
  if (periodNum === 1) return "1st";
  if (periodNum === 2) return "2nd";
  if (periodNum === 3) return "1st ET";
  if (periodNum === 4) return "2nd ET";
  return "";
};

const getShotDetails = (shot: Shot): string => {
  const details: string[] = [];

  const isGoal =
    shot.shot_outcome_name &&
    shot.shot_outcome_name.toLowerCase().includes("goal");

  if (isGoal) details.push("Goal");

  if (shot.phase) {
    const phaseLower = shot.phase.toLowerCase();
    if (phaseLower.includes("set")) {
      if (shot.set_piece_type) {
        const spLower = shot.set_piece_type.toLowerCase();
        if (spLower.includes("corner")) details.push("Corner");
        else if (spLower.includes("free")) details.push("Free Kick");
        else if (spLower.includes("throw")) details.push("Throw In");
        else details.push("Set Piece");
      } else {
        details.push("Set Piece");
      }
    } else if (phaseLower.includes("transition")) {
      details.push("Transition");
    } else if (phaseLower.includes("build")) {
      details.push("Build-up");
    }
  }

  if (shot.shot_type_name?.toLowerCase().includes("penalty")) {
    details.push("Penalty");
  }

  let isHeader = false;
  if (shot.shot_technique_name) {
    const techniqueLower = shot.shot_technique_name.toLowerCase();
    if (techniqueLower.includes("header") || techniqueLower === "head") {
      details.push("Header");
      isHeader = true;
    }
  }
  if (!isHeader && shot.shot_body_part_name) {
    const bodyPartLower = shot.shot_body_part_name.toLowerCase();
    if (bodyPartLower.includes("header") || bodyPartLower === "head") {
      details.push("Header");
      isHeader = true;
    }
  }
  if (!isHeader && shot.shot_body_part_name?.toLowerCase().includes("foot")) {
    details.push("Foot");
  }

  return details.length > 0 ? details.join(", ") : "Shot";
};

const ShotsTable = ({
  shots,
  selectedMatch,
  selectedTeamId,
  selectedTeamName,
  onShotClick,
  hoveredShotId,
  selectedShotId,
}: ShotsTableProps) => {
  const leftTeamName = useMemo(() => {
    if (!selectedMatch) return selectedTeamName;
    if (selectedTeamName) return selectedTeamName;
    return selectedMatch.selected_team_name ?? null;
  }, [selectedMatch, selectedTeamName]);

  const rightTeamName = useMemo(() => {
    if (!selectedMatch) return null;
    if (leftTeamName && selectedMatch.selected_team_name === leftTeamName) {
      return selectedMatch.opposition_team_name;
    }
    if (leftTeamName && selectedMatch.opposition_team_name === leftTeamName) {
      return selectedMatch.selected_team_name;
    }
    return selectedMatch.opposition_team_name;
  }, [selectedMatch, leftTeamName]);

  const tableData = useMemo(() => {
    if (!selectedMatch || shots.length === 0) return [];

    const matchTeamName = selectedMatch.selected_team_name;

    const processedShots = shots
      .map((shot) => {
        const matchMinute = getMatchMinute(shot.timestamp, shot.period);
        if (matchMinute == null || shot.shot_statsbomb_xg == null) return null;

        const normalizedShotTeamId = shot.team_id != null ? Number(shot.team_id) : null;
        const normalizedSelectedTeamId =
          selectedTeamId != null ? Number(selectedTeamId) : null;

        let isLeftTeam = false;
        if (
          normalizedSelectedTeamId != null &&
          !isNaN(normalizedSelectedTeamId) &&
          normalizedShotTeamId != null &&
          !isNaN(normalizedShotTeamId)
        ) {
          isLeftTeam = normalizedShotTeamId === normalizedSelectedTeamId;
        } else {
          const shotTeamName = (shot.team_name ?? "").trim();
          const normalizedLeftTeam = (leftTeamName ?? matchTeamName ?? "").toLowerCase().trim();
          isLeftTeam = shotTeamName.toLowerCase() === normalizedLeftTeam;
        }

        return { shot, matchMinute, isLeftTeam, period: shot.period };
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
      .sort((a, b) => a.matchMinute - b.matchMinute);

    const rows: TableRow[] = [];
    let runningHomeCumulativeXg = 0;
    let runningAwayCumulativeXg = 0;

    const shotsByMinute = new Map<number, typeof processedShots>();
    processedShots.forEach((item) => {
      const minuteKey = Math.floor(item.matchMinute);
      if (!shotsByMinute.has(minuteKey)) {
        shotsByMinute.set(minuteKey, []);
      }
      shotsByMinute.get(minuteKey)!.push(item);
    });

    Array.from(shotsByMinute.keys())
      .sort((a, b) => a - b)
      .forEach((minuteKey) => {
        const minuteShots = shotsByMinute.get(minuteKey)!;
        const homeShots = minuteShots.filter((s) => s.isLeftTeam);
        const awayShots = minuteShots.filter((s) => !s.isLeftTeam);

        const firstShot = minuteShots[0];
        const period =
          typeof firstShot.period === "string"
            ? parseInt(firstShot.period, 10)
            : (firstShot.period ?? 1);
        const periodLabel = getPeriodLabel(firstShot.period);
        const minute = firstShot.matchMinute;

        const maxShots = Math.max(homeShots.length, awayShots.length);

        for (let i = 0; i < maxShots; i++) {
          const homeShot = homeShots[i] ?? null;
          const awayShot = awayShots[i] ?? null;

          if (homeShot) runningHomeCumulativeXg += homeShot.shot.shot_statsbomb_xg ?? 0;
          if (awayShot) runningAwayCumulativeXg += awayShot.shot.shot_statsbomb_xg ?? 0;

          rows.push({
            id: `minute-${minuteKey}-${i}`,
            homeTeamShot: homeShot?.shot ?? null,
            awayTeamShot: awayShot?.shot ?? null,
            minute,
            period,
            periodLabel,
            homeCumulativeXg: runningHomeCumulativeXg,
            awayCumulativeXg: runningAwayCumulativeXg,
          });
        }
      });

    return rows;
  }, [shots, selectedMatch, selectedTeamId, leftTeamName]);

  if (!selectedMatch || tableData.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
          </colgroup>
          <thead className="bg-muted">
            <tr>
              <th
                colSpan={4}
                className="border-b border-r border-border px-4 py-3 text-center text-xs font-bold uppercase tracking-wide"
              >
                {leftTeamName ?? "Selected Team"}
              </th>
              <th className="border-b border-r border-border px-3 py-3 text-center text-xs font-bold uppercase tracking-wide">
                Half
              </th>
              <th className="border-b border-r border-border px-3 py-3 text-center text-xs font-bold uppercase tracking-wide">
                Minute
              </th>
              <th
                colSpan={4}
                className="border-b border-border px-4 py-3 text-center text-xs font-bold uppercase tracking-wide"
              >
                {rightTeamName ?? "Opposition"}
              </th>
            </tr>
            <tr>
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                Player
              </th>
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                Details
              </th>
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                xG
              </th>
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                Cum. xG
              </th>
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground" />
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground" />
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                Cum. xG
              </th>
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                xG
              </th>
              <th className="border-b border-r border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                Details
              </th>
              <th className="border-b border-border px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                Player
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => {
              const isEven = index % 2 === 0;
              const homeIsSelected = row.homeTeamShot?.event_id === selectedShotId;
              const awayIsSelected = row.awayTeamShot?.event_id === selectedShotId;
              const isSelected = homeIsSelected || awayIsSelected;

              const homeIsHovered = row.homeTeamShot?.event_id === hoveredShotId;
              const awayIsHovered = row.awayTeamShot?.event_id === hoveredShotId;

              const homeHoverColor = "bg-blue-100 dark:bg-blue-900/40 dark:text-blue-100";
              const awayHoverColor = "bg-red-100 dark:bg-red-900/40 dark:text-red-100";
              const homeSelectedColor = "bg-blue-200 dark:bg-blue-800/60 dark:text-blue-50";
              const awaySelectedColor = "bg-red-200 dark:bg-red-800/60 dark:text-red-50";

              const bgColor = isSelected
                ? ""
                : isEven
                  ? "bg-card"
                  : "bg-muted/50";

              return (
                <tr
                  key={row.id}
                  className={`${bgColor} transition-colors hover:bg-muted ${isSelected ? "dark:bg-muted/30" : ""}`}
                >
                  {/* Home team columns */}
                  <td
                    className={`border-b border-r border-border px-3 py-2.5 text-center text-xs ${row.homeTeamShot && onShotClick ? "cursor-pointer hover:opacity-80" : "text-muted-foreground"} ${homeIsSelected ? homeSelectedColor : homeIsHovered ? homeHoverColor : ""} ${row.homeTeamShot ? "font-medium" : ""}`}
                    onClick={() => row.homeTeamShot && onShotClick?.(row.homeTeamShot.event_id)}
                  >
                    {row.homeTeamShot?.player_name ?? "\u2014"}
                  </td>
                  <td
                    className={`border-b border-r border-border px-3 py-2.5 text-center text-xs ${row.homeTeamShot && onShotClick ? "cursor-pointer hover:opacity-80" : "text-muted-foreground"} ${homeIsSelected ? homeSelectedColor : homeIsHovered ? homeHoverColor : ""}`}
                    onClick={() => row.homeTeamShot && onShotClick?.(row.homeTeamShot.event_id)}
                  >
                    {row.homeTeamShot ? getShotDetails(row.homeTeamShot) : "\u2014"}
                  </td>
                  <td
                    className={`border-b border-r border-border px-3 py-2.5 text-center font-mono text-xs ${row.homeTeamShot && onShotClick ? "cursor-pointer hover:opacity-80" : "text-muted-foreground"} ${homeIsSelected ? homeSelectedColor : homeIsHovered ? homeHoverColor : ""}`}
                    onClick={() => row.homeTeamShot && onShotClick?.(row.homeTeamShot.event_id)}
                  >
                    {row.homeTeamShot?.shot_statsbomb_xg?.toFixed(2) ?? "\u2014"}
                  </td>
                  <td
                    className={`border-b border-r border-border px-3 py-2.5 text-center font-mono text-xs font-semibold ${row.homeTeamShot && onShotClick ? "cursor-pointer hover:opacity-80" : "text-muted-foreground"} ${homeIsSelected ? homeSelectedColor : homeIsHovered ? homeHoverColor : ""}`}
                    onClick={() => row.homeTeamShot && onShotClick?.(row.homeTeamShot.event_id)}
                  >
                    {row.homeTeamShot ? row.homeCumulativeXg.toFixed(2) : "\u2014"}
                  </td>

                  {/* Period and Minute (shared) */}
                  <td
                    className={`border-b border-r border-border bg-muted px-3 py-2.5 text-center text-xs font-semibold ${isSelected ? "dark:bg-muted/50" : ""}`}
                  >
                    {row.periodLabel}
                  </td>
                  <td
                    className={`border-b border-r border-border bg-muted px-3 py-2.5 text-center text-xs font-semibold ${isSelected ? "dark:bg-muted/50" : ""}`}
                  >
                    {`${Math.floor(row.minute)}'`}
                  </td>

                  {/* Away team columns */}
                  <td
                    className={`border-b border-r border-border px-3 py-2.5 text-center font-mono text-xs font-semibold ${row.awayTeamShot && onShotClick ? "cursor-pointer hover:opacity-80" : "text-muted-foreground"} ${awayIsSelected ? awaySelectedColor : awayIsHovered ? awayHoverColor : ""}`}
                    onClick={() => row.awayTeamShot && onShotClick?.(row.awayTeamShot.event_id)}
                  >
                    {row.awayTeamShot ? row.awayCumulativeXg.toFixed(2) : "\u2014"}
                  </td>
                  <td
                    className={`border-b border-r border-border px-3 py-2.5 text-center font-mono text-xs ${row.awayTeamShot && onShotClick ? "cursor-pointer hover:opacity-80" : "text-muted-foreground"} ${awayIsSelected ? awaySelectedColor : awayIsHovered ? awayHoverColor : ""}`}
                    onClick={() => row.awayTeamShot && onShotClick?.(row.awayTeamShot.event_id)}
                  >
                    {row.awayTeamShot?.shot_statsbomb_xg?.toFixed(2) ?? "\u2014"}
                  </td>
                  <td
                    className={`border-b border-r border-border px-3 py-2.5 text-center text-xs ${row.awayTeamShot && onShotClick ? "cursor-pointer hover:opacity-80" : "text-muted-foreground"} ${awayIsSelected ? awaySelectedColor : awayIsHovered ? awayHoverColor : ""}`}
                    onClick={() => row.awayTeamShot && onShotClick?.(row.awayTeamShot.event_id)}
                  >
                    {row.awayTeamShot ? getShotDetails(row.awayTeamShot) : "\u2014"}
                  </td>
                  <td
                    className={`border-b border-border px-3 py-2.5 text-center text-xs ${row.awayTeamShot && onShotClick ? "cursor-pointer hover:opacity-80" : "text-muted-foreground"} ${awayIsSelected ? awaySelectedColor : awayIsHovered ? awayHoverColor : ""} ${row.awayTeamShot ? "font-medium" : ""}`}
                    onClick={() => row.awayTeamShot && onShotClick?.(row.awayTeamShot.event_id)}
                  >
                    {row.awayTeamShot?.player_name ?? "\u2014"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShotsTable;
