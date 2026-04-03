"use client";

import { PlayerEventIcons } from "./EventIcons";
import type { PlayerData } from "./types";

interface LineupTableProps {
  teamName: string;
  starters: PlayerData[];
  formation?: string;
  teamColor?: string;
}

export default function LineupTable({
  teamName,
  starters,
  formation,
  teamColor = "#1a365d",
}: LineupTableProps) {
  return (
    <div className="w-full">
      <div
        className="rounded-t py-2 px-3 text-center text-sm font-bold text-white"
        style={{ backgroundColor: teamColor }}
      >
        {teamName} Lineup {formation && `(${formation})`}
      </div>
      <div className="overflow-hidden rounded-b border border-border">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col style={{ width: "12%" }} />
            <col style={{ width: "45%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr className="text-white" style={{ backgroundColor: "#666666" }}>
              <th className="py-2 px-3 text-left text-xs font-bold">Pos</th>
              <th className="py-2 px-3 text-left text-xs font-bold">Player</th>
              <th className="py-2 px-3 text-center text-xs font-bold" />
              <th className="py-2 px-3 text-center text-xs font-bold">Mins</th>
            </tr>
          </thead>
          <tbody>
            {starters.map((player, idx) => (
              <tr
                key={`${player.Player}-${idx}`}
                className="border-b border-border bg-muted/50 last:border-b-0"
              >
                <td className="px-3 py-2 text-xs font-semibold">{player.Pos}</td>
                <td className="px-3 py-2 text-xs">
                  {player.Player}
                  {player.SubOffTime != null && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      (Sub {player.SubOffTime}&apos;)
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-xs">
                  <PlayerEventIcons player={player} />
                </td>
                <td className="px-3 py-2 text-center text-xs font-semibold">
                  {player.Mins}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
