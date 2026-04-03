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
import type { RefereeRow } from "./types";

interface FoulsTableProps {
  fouls: RefereeRow[];
}

type SortKey =
  | "match_label"
  | "match_date"
  | "fouls_home"
  | "fouls_away"
  | "yellow_cards"
  | "red_cards"
  | "penalties";

const columns: { key: SortKey; label: string }[] = [
  { key: "match_label", label: "Match" },
  { key: "match_date", label: "Date" },
  { key: "fouls_home", label: "Fouls Home" },
  { key: "fouls_away", label: "Fouls Away" },
  { key: "yellow_cards", label: "Yellow Cards" },
  { key: "red_cards", label: "Red Cards" },
  { key: "penalties", label: "Penalties" },
];

export default function FoulsTable({ fouls }: FoulsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("match_date");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = useMemo(() => {
    const copy = [...fouls];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
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
  }, [fouls, sortKey, sortAsc]);

  if (fouls.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        No fouls data available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row, i) => (
            <TableRow key={`${row.match_id}-${i}`}>
              <TableCell className="font-medium">
                {row.match_label ?? "-"}
              </TableCell>
              <TableCell>{row.match_date ?? "-"}</TableCell>
              <TableCell className="text-center">
                {row.fouls_home ?? 0}
              </TableCell>
              <TableCell className="text-center">
                {row.fouls_away ?? 0}
              </TableCell>
              <TableCell className="text-center">
                {row.yellow_cards ?? 0}
              </TableCell>
              <TableCell className="text-center">
                {row.red_cards ?? 0}
              </TableCell>
              <TableCell className="text-center">
                {row.penalties ?? 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
