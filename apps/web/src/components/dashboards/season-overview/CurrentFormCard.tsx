"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, History } from "lucide-react";
import { formatPpg } from "./utils";
import type { FormCode, PerformanceSplit } from "./types";

const resultBadgeStyle: Record<
  FormCode,
  { backgroundColor: string; color: string }
> = {
  W: { backgroundColor: "#16a34a", color: "#ffffff" },
  D: { backgroundColor: "#d97706", color: "#ffffff" },
  L: { backgroundColor: "#dc2626", color: "#ffffff" },
};

interface CurrentFormCardProps {
  formSequence: FormCode[];
  form5Split: PerformanceSplit;
  form10Split: PerformanceSplit;
}

export default function CurrentFormCard({
  formSequence,
  form5Split,
  form10Split,
}: CurrentFormCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" />
          Current Form
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Form Sequence Bar */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Last 5:
          </span>
          <div className="flex items-center gap-1.5">
            {formSequence.length > 0 ? (
              formSequence.map((result, index) => (
                <span
                  key={`${result}-${index}`}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none shadow-sm"
                  style={resultBadgeStyle[result]}
                >
                  {result}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        </div>

        {/* Stats Split */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col rounded-xl border bg-muted/20 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 border-b border-muted pb-2">
              <div className="rounded-md bg-primary/10 p-1.5">
                <Clock className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-primary">Last 5</p>
            </div>
            <div className="mt-1 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">W-D-L</span>
                <span className="font-medium">
                  {form5Split.wins}-{form5Split.draws}-{form5Split.losses}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PPG</span>
                <span className="font-medium">{formatPpg(form5Split.ppg)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border bg-muted/20 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 border-b border-muted pb-2">
              <div className="rounded-md bg-primary/10 p-1.5">
                <History className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-primary">Last 10</p>
            </div>
            <div className="mt-1 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">W-D-L</span>
                <span className="font-medium">
                  {form10Split.wins}-{form10Split.draws}-{form10Split.losses}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PPG</span>
                <span className="font-medium">
                  {formatPpg(form10Split.ppg)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
