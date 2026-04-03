"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSigned } from "./utils";
import type { PhaseRow } from "./types";

interface PhaseStrengthsCardProps {
  phaseRows: PhaseRow[];
  emptyMessage?: string;
}

export default function PhaseStrengthsCard({
  phaseRows,
  emptyMessage = "No phase-average data available for this selection.",
}: PhaseStrengthsCardProps) {
  const ranked = [...phaseRows].sort((a, b) => b.score - a.score);
  const strongestPhase = ranked[0] ?? null;
  const weakestPhase = ranked[ranked.length - 1] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase Strengths</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phaseRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left font-semibold">Phase</th>
                  <th className="px-2 py-2 text-right font-semibold">
                    Goals Delta
                  </th>
                  <th className="px-2 py-2 text-right font-semibold">
                    xT Delta
                  </th>
                  <th className="px-2 py-2 text-right font-semibold">
                    xG Delta
                  </th>
                </tr>
              </thead>
              <tbody>
                {phaseRows.map((row) => {
                  const isStrongest = strongestPhase?.key === row.key;
                  const isWeakest = weakestPhase?.key === row.key;
                  return (
                    <tr key={row.key} className="border-b last:border-b-0">
                      <td className="px-2 py-2">
                        <span
                          className={`font-medium ${
                            isStrongest
                              ? "text-green-700"
                              : isWeakest
                                ? "text-red-700"
                                : "text-foreground"
                          }`}
                        >
                          {row.label}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatSigned(row.goalsDelta, 2)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatSigned(row.xtDelta, 2)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatSigned(row.xgDelta, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
