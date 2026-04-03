"use client";

import { PlayerEventIcons } from "./EventIcons";
import type { PlayerData } from "./types";

interface SubstitutesTableProps {
  subs: PlayerData[];
  teamColor?: string;
}

export default function SubstitutesTable({
  subs,
  teamColor = "#1a365d",
}: SubstitutesTableProps) {
  if (subs.length === 0) return null;

  // Separate used subs (came on) from unused
  const usedSubs = subs.filter((s) => s.SubOnTime != null);
  const unusedSubs = subs.filter((s) => s.SubOnTime == null);
  const orderedSubs = [...usedSubs, ...unusedSubs];

  return (
    <div className="w-full">
      <div
        className="rounded-t py-2 px-3 text-center text-sm font-bold text-white"
        style={{ backgroundColor: teamColor }}
      >
        Substitutes
      </div>
      <div className="overflow-hidden rounded-b border border-border">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col style={{ width: "12%" }} />
            <col style={{ width: "35%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr className="text-white" style={{ backgroundColor: "#666666" }}>
              <th className="py-2 px-3 text-left text-xs font-bold">Pos</th>
              <th className="py-2 px-3 text-left text-xs font-bold">Player</th>
              <th className="py-2 px-3 text-center text-xs font-bold" />
              <th className="py-2 px-3 text-center text-xs font-bold">In/Out</th>
              <th className="py-2 px-3 text-center text-xs font-bold">Mins</th>
            </tr>
          </thead>
          <tbody>
            {orderedSubs.map((player, idx) => {
              const isUsed = player.SubOnTime != null;
              return (
                <tr
                  key={`${player.Player}-${idx}`}
                  className={`border-b border-border last:border-b-0 ${
                    isUsed ? "bg-muted/50" : "bg-muted/20 text-muted-foreground"
                  }`}
                >
                  <td className="px-3 py-2 text-xs font-semibold">{player.Pos}</td>
                  <td className={`px-3 py-2 text-xs ${isUsed ? "font-medium" : ""}`}>
                    {player.Player}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <PlayerEventIcons player={player} />
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {player.SubOnTime != null && (
                      <span className="text-green-700">In: {player.SubOnTime}&apos;</span>
                    )}
                    {player.SubOffTime != null && (
                      <span className="ml-1 text-red-700">Out: {player.SubOffTime}&apos;</span>
                    )}
                    {player.SubOnTime == null && (
                      <span className="text-muted-foreground">Unused</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-semibold">
                    {player.Mins}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
