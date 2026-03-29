"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id, Doc } from "@packages/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import {
  IconFirstAidKit,
  IconPlus,
  IconPencil,
  IconTrash,
  IconDots,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { InjuryFormDialog } from "./InjuryFormDialog";
import { DeleteInjuryDialog } from "./DeleteInjuryDialog";

interface InjuryLogProps {
  playerId: Id<"players">;
}

type PlayerInjury = Doc<"playerInjuries">;

// Badge styling maps (AC #3)
const severityClasses: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  moderate: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  severe: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const statusVariant: Record<string, "destructive" | "default"> = {
  current: "destructive",
  recovered: "default",
};

const statusClasses: Record<string, string> = {
  current: "",
  recovered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export function InjuryLog({ playerId }: InjuryLogProps) {
  const entries = useQuery(api.players.queries.getPlayerInjuries, { playerId });

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlayerInjury | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<PlayerInjury | undefined>(undefined);

  // AC #13: Current injury summary computation
  const summary = useMemo(() => {
    if (!entries) return null;

    const current = entries.filter((e) => e.status === "current");
    const recovered = entries.filter((e) => e.status === "recovered");

    return {
      currentCount: current.length,
      recoveredCount: recovered.length,
      totalCount: entries.length,
      currentInjuries: current,
    };
  }, [entries]);

  // Loading state
  if (entries === undefined) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <IconPlus className="mr-1.5 size-4" />
            Log Injury
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <IconFirstAidKit className="text-muted-foreground mb-3 size-10" />
          <h3 className="text-lg font-medium">No injury records</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Click &quot;Log Injury&quot; to record an injury.
          </p>
        </div>
        <InjuryFormDialog
          playerId={playerId}
          open={formOpen}
          onClose={() => setFormOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: summary + log button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* AC #13: Summary section */}
        {summary && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SummaryCard
                label="Current Injuries"
                value={String(summary.currentCount)}
                accent={summary.currentCount > 0}
              />
              <SummaryCard
                label="Recovered"
                value={String(summary.recoveredCount)}
              />
              <SummaryCard
                label="Total Records"
                value={String(summary.totalCount)}
              />
            </div>
            {/* Current injury list */}
            {summary.currentInjuries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {summary.currentInjuries.map((inj) => (
                  <Badge key={inj._id} variant="destructive" className="text-xs">
                    {inj.injuryType} — {format(new Date(inj.date), "dd MMM yyyy")}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
        <Button
          onClick={() => {
            setEditingEntry(undefined);
            setFormOpen(true);
          }}
          className="shrink-0"
        >
          <IconPlus className="mr-1.5 size-4" />
          Log Injury
        </Button>
      </div>

      {/* AC #3: Injury data table */}
      <TooltipProvider>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Injury Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Est. Recovery</TableHead>
                  <TableHead>Clearance Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>
                      {format(new Date(entry.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <NotesCell text={entry.injuryType} maxLen={40} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={severityClasses[entry.severity] ?? ""}
                      >
                        {capitalize(entry.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant[entry.status] ?? "default"}
                        className={statusClasses[entry.status] ?? ""}
                      >
                        {capitalize(entry.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.estimatedRecovery || "—"}
                    </TableCell>
                    <TableCell>
                      {entry.clearanceDate
                        ? format(new Date(entry.clearanceDate), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <IconDots className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingEntry(entry);
                              setFormOpen(true);
                            }}
                          >
                            <IconPencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(entry)}
                          >
                            <IconTrash className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TooltipProvider>

      {/* Dialogs */}
      <InjuryFormDialog
        playerId={playerId}
        existingEntry={editingEntry}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEntry(undefined);
        }}
      />
      {deleteTarget && (
        <DeleteInjuryDialog
          injuryId={deleteTarget._id}
          date={deleteTarget.date}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(undefined)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="px-3 py-2">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={`text-lg font-semibold ${accent ? "text-destructive" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function NotesCell({ text, maxLen }: { text: string; maxLen: number }) {
  if (text.length <= maxLen) {
    return <span>{text}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{text.slice(0, maxLen)}…</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
