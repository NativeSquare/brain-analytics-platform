"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Possession } from "./types";

interface PossessionTableProps {
  possessions: Possession[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

type SortKey =
  | "index"
  | "phase"
  | "starting_third"
  | "duration_seconds"
  | "shot_count"
  | "goal"
  | "total_xg";

const columns: { key: SortKey; label: string }[] = [
  { key: "index", label: "#" },
  { key: "phase", label: "Phase" },
  { key: "starting_third", label: "Start Zone" },
  { key: "duration_seconds", label: "Duration (s)" },
  { key: "shot_count", label: "Shots" },
  { key: "goal", label: "Goals" },
  { key: "total_xg", label: "xG" },
];

function getOutcome(p: Possession): string {
  if (p.goal > 0) return "Goal";
  if (p.shot_count > 0) return "Shot";
  return "-";
}

export default function PossessionTable({
  possessions,
  selectedIndex,
  onSelect,
}: PossessionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("index");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Indexed possessions for stable identity
  const indexed = useMemo(
    () => possessions.map((p, i) => ({ ...p, _idx: i })),
    [possessions],
  );

  const sorted = useMemo(() => {
    const copy = [...indexed];
    copy.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortKey === "index") {
        aVal = a._idx;
        bVal = b._idx;
      } else {
        aVal = a[sortKey] as string | number;
        bVal = b[sortKey] as string | number;
      }

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const diff = Number(aVal) - Number(bVal);
      return sortAsc ? diff : -diff;
    });
    return copy;
  }, [indexed, sortKey, sortAsc]);

  if (possessions.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        No possessions found for the selected filters.
      </div>
    );
  }

  return (
    <div className="max-h-[600px] overflow-auto rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <ArrowUpDown className="size-3 opacity-50" />
                </span>
              </TableHead>
            ))}
            <TableHead>Outcome</TableHead>
            <TableHead>Team</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const isSelected = row._idx === selectedIndex;
            return (
              <TableRow
                key={row._idx}
                className={cn(
                  "cursor-pointer",
                  isSelected && "bg-accent",
                )}
                onClick={() => onSelect(row._idx)}
              >
                <TableCell>{row._idx + 1}</TableCell>
                <TableCell>{row.phase}</TableCell>
                <TableCell>{row.starting_third}</TableCell>
                <TableCell className="text-center">
                  {row.duration_seconds.toFixed(1)}
                </TableCell>
                <TableCell className="text-center">
                  {row.shot_count}
                </TableCell>
                <TableCell className="text-center">{row.goal}</TableCell>
                <TableCell className="text-center">
                  {row.total_xg > 0 ? row.total_xg.toFixed(2) : "-"}
                </TableCell>
                <TableCell>{getOutcome(row)}</TableCell>
                <TableCell className="max-w-[120px] truncate">
                  {row.possession_team}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
