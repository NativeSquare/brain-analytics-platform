"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MetricDefinition, MetricFormat, Side, ScopeRow, Scope } from "./types";

const numberFormat0 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const numberFormat2 = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFormat3 = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const numberFormatIntAvg = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatMetric(value: number | null | undefined, format: MetricFormat): string {
  if (value == null || Number.isNaN(value)) return "\u2014";
  if (format === "minutes") {
    const total = Math.round(value);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  if (format === "int") return numberFormat0.format(value);
  if (format === "int_avg") return numberFormatIntAvg.format(value);
  if (format === "dec2") return numberFormat2.format(value);
  if (format === "dec3") return numberFormat3.format(value);
  return `${numberFormat0.format(value)}%`;
}

function getScopeRow(rows: ScopeRow[], side: Side, scope: Scope): ScopeRow | null {
  return rows.find((r) => r.side === side && r.scope === scope) ?? null;
}

interface PossessionMetricCardProps {
  title: string;
  side: Side;
  rows: ScopeRow[];
  metrics: MetricDefinition[];
  headerColor?: string;
}

const PossessionMetricCard = ({
  title,
  side,
  rows,
  metrics,
  headerColor,
}: PossessionMetricCardProps) => {
  const matchRow = getScopeRow(rows, side, "match");
  const seasonRow = getScopeRow(rows, side, "season_avg");

  return (
    <Card className="overflow-hidden border-border/70 bg-card pt-0 shadow-sm">
      <CardHeader
        className="flex min-h-14 items-center justify-center border-b px-6 py-3"
        style={headerColor ? { backgroundColor: headerColor } : undefined}
      >
        <CardTitle
          className={`w-full text-center text-base ${headerColor ? "text-white" : ""}`}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="table-fixed">
          <colgroup>
            <col className="w-1/2" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2 text-xs uppercase tracking-wide">Metric</TableHead>
              <TableHead className="w-1/4 text-center text-xs uppercase tracking-wide">Match</TableHead>
              <TableHead className="w-1/4 text-center text-xs uppercase tracking-wide">Season</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => (
              <TableRow key={metric.label}>
                <TableCell className="w-1/2">{metric.label}</TableCell>
                <TableCell className="w-1/4 text-center">
                  {formatMetric(
                    (matchRow?.[metric.key] as number | null | undefined) ?? null,
                    metric.matchFormat,
                  )}
                </TableCell>
                <TableCell className="w-1/4 text-center">
                  {(() => {
                    const seasonValue = formatMetric(
                      (seasonRow?.[metric.key] as number | null | undefined) ?? null,
                      metric.seasonFormat ?? metric.matchFormat,
                    );
                    const rankRaw =
                      metric.rankKey != null
                        ? ((seasonRow?.[metric.rankKey] as number | null | undefined) ?? null)
                        : null;
                    if (rankRaw == null || Number.isNaN(rankRaw) || seasonValue === "\u2014")
                      return seasonValue;
                    return `${seasonValue} (${Math.round(rankRaw)})`;
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PossessionMetricCard;
