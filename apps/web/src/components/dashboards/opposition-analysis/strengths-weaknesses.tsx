"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StrengthWeakness } from "./types";

interface StrengthsWeaknessesProps {
  strengths: StrengthWeakness[];
  weaknesses: StrengthWeakness[];
}

export default function StrengthsWeaknesses({
  strengths,
  weaknesses,
}: StrengthsWeaknessesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Strengths & Weaknesses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Strengths */}
          <div>
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-4" />
              Strengths
            </h4>
            {strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notable strengths detected
              </p>
            ) : (
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <li
                    key={s.metricKey}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        +{Math.abs(s.deviation).toFixed(1)} SD
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.value.toFixed(2)} vs league avg {s.leagueAvg.toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weaknesses */}
          <div>
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
              <TrendingDown className="size-4" />
              Weaknesses
            </h4>
            {weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notable weaknesses detected
              </p>
            ) : (
              <ul className="space-y-2">
                {weaknesses.map((w) => (
                  <li
                    key={w.metricKey}
                    className="rounded-lg border border-red-200 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{w.label}</span>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        {w.deviation.toFixed(1)} SD
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {w.value.toFixed(2)} vs league avg {w.leagueAvg.toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
