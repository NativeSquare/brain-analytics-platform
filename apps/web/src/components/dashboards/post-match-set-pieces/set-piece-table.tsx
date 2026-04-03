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
import { sbToSvg, assignToZone } from "../set-pieces/set-piece-zones";
import type { SetPiece } from "../set-pieces/types";

interface SetPieceTableProps {
  items: SetPiece[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

type SortKey =
  | "sp_type"
  | "side"
  | "taker"
  | "first_contact"
  | "outcome"
  | "zone";

const columns: { key: SortKey; label: string }[] = [
  { key: "sp_type", label: "Type" },
  { key: "side", label: "Side" },
  { key: "taker", label: "Taker" },
  { key: "first_contact", label: "First Contact" },
  { key: "outcome", label: "Outcome" },
  { key: "zone", label: "Zone" },
];

function getZoneLabel(sp: SetPiece): string {
  const x = sp.first_phase_first_contact_x;
  const y = sp.first_phase_first_contact_y;
  if (x == null || y == null) return "-";
  const svg = sbToSvg(x, y);
  const zone = assignToZone(svg.x, svg.y);
  return zone?.label ?? "-";
}

function getOutcome(sp: SetPiece): string {
  if (sp.goal && sp.goal > 0) return "Goal";
  if (sp.first_phase_first_contact_shot) return "Shot";
  if (sp.shot_outcome_name) return sp.shot_outcome_name;
  return "-";
}

function getCellValue(sp: SetPiece, key: SortKey): string {
  switch (key) {
    case "sp_type":
      return sp.sp_type ?? "-";
    case "side":
      return sp.side ?? "-";
    case "taker":
      return sp.taker ?? "-";
    case "first_contact":
      return sp.first_phase_first_contact_player ?? "-";
    case "outcome":
      return getOutcome(sp);
    case "zone":
      return getZoneLabel(sp);
  }
}

export default function SetPieceTable({
  items,
  selectedId,
  onSelect,
}: SetPieceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("sp_type");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const aVal = getCellValue(a, sortKey);
      const bVal = getCellValue(b, sortKey);
      const cmp = aVal.localeCompare(bVal);
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [items, sortKey, sortAsc]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        No set pieces found for the selected filters.
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((sp) => {
            const isSelected = sp.start_event_id === selectedId;
            return (
              <TableRow
                key={sp.start_event_id}
                className={cn(
                  "cursor-pointer",
                  isSelected && "bg-accent",
                )}
                onClick={() => onSelect(sp.start_event_id)}
              >
                <TableCell>{sp.sp_type ?? "-"}</TableCell>
                <TableCell>{sp.side ?? "-"}</TableCell>
                <TableCell className="max-w-[120px] truncate">
                  {sp.taker ?? "-"}
                </TableCell>
                <TableCell className="max-w-[120px] truncate">
                  {sp.first_phase_first_contact_player ?? "-"}
                </TableCell>
                <TableCell>{getOutcome(sp)}</TableCell>
                <TableCell>{getZoneLabel(sp)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
