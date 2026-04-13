"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id, Doc } from "@packages/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import {
  IconHeartbeat,
  IconPlus,
  IconPencil,
  IconTrash,
  IconDots,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
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

import { FitnessFormDialog } from "./FitnessFormDialog";
import { DeleteFitnessDialog } from "./DeleteFitnessDialog";

interface FitnessLogProps {
  playerId: Id<"players">;
  canEdit: boolean;
}

type PlayerFitness = Doc<"playerFitness">;

export function FitnessLog({ playerId, canEdit }: FitnessLogProps) {
  const entries = useQuery(api.players.queries.getPlayerFitness, { playerId });

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlayerFitness | undefined>(
    undefined
  );
  const [deleteTarget, setDeleteTarget] = useState<PlayerFitness | undefined>(
    undefined
  );

  // AC #13: Latest metrics summary computation
  const latestMetrics = useMemo(() => {
    if (!entries || entries.length === 0) return null;

    const withWeight = entries.filter((e) => e.weightKg !== undefined);
    const withBodyFat = entries.filter(
      (e) => e.bodyFatPercentage !== undefined
    );

    const latestWeight =
      withWeight.length > 0 ? withWeight[0] : null;
    const latestBodyFat =
      withBodyFat.length > 0 ? withBodyFat[0] : null;

    // Weight trend: compare last two weight entries
    let weightTrend: "up" | "down" | "stable" | null = null;
    if (withWeight.length >= 2) {
      const diff = withWeight[0].weightKg! - withWeight[1].weightKg!;
      weightTrend = diff > 0 ? "up" : diff < 0 ? "down" : "stable";
    }

    return {
      latestWeight: latestWeight
        ? { value: latestWeight.weightKg!, date: latestWeight.date }
        : null,
      latestBodyFat: latestBodyFat
        ? {
            value: latestBodyFat.bodyFatPercentage!,
            date: latestBodyFat.date,
          }
        : null,
      totalEntries: entries.length,
      dateRange: {
        earliest: entries[entries.length - 1].date,
        latest: entries[0].date,
      },
      weightTrend,
    };
  }, [entries]);

  // Loading state
  if (entries === undefined) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={() => setFormOpen(true)}>
              <IconPlus className="mr-1.5 size-4" />
              Add Entry
            </Button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <IconHeartbeat className="text-muted-foreground mb-3 size-10" />
          <h3 className="text-lg font-medium">
            No fitness data recorded yet
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {canEdit
              ? 'Click "Add Entry" to record fitness data.'
              : "Fitness data will appear here once recorded."}
          </p>
        </div>
        {canEdit && (
          <FitnessFormDialog
            playerId={playerId}
            open={formOpen}
            onClose={() => setFormOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary metrics + action */}
      <div className="flex items-start justify-between gap-4">
        {latestMetrics && (
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Latest Weight</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <p className="text-2xl font-black text-foreground">
                    {latestMetrics.latestWeight
                      ? `${latestMetrics.latestWeight.value.toFixed(1)} kg`
                      : "—"}
                  </p>
                  {latestMetrics.weightTrend === "up" && (
                    <IconTrendingUp className="size-4 text-red-500" />
                  )}
                  {latestMetrics.weightTrend === "down" && (
                    <IconTrendingDown className="size-4 text-green-500" />
                  )}
                  {latestMetrics.weightTrend === "stable" && (
                    <IconMinus className="text-muted-foreground size-4" />
                  )}
                </div>
                {latestMetrics.latestWeight && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(latestMetrics.latestWeight.date), "dd/MM/yyyy")}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Latest Body Fat</p>
                <p className="mt-1 text-2xl font-black text-foreground">
                  {latestMetrics.latestBodyFat
                    ? `${latestMetrics.latestBodyFat.value.toFixed(1)}%`
                    : "—"}
                </p>
                {latestMetrics.latestBodyFat && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(latestMetrics.latestBodyFat.date), "dd/MM/yyyy")}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Entries</p>
                <p className="mt-1 text-2xl font-black text-foreground">{latestMetrics.totalEntries}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date Range</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {format(new Date(latestMetrics.dateRange.earliest), "dd/MM/yyyy")}
                </p>
                <p className="text-lg font-bold text-foreground">
                  {format(new Date(latestMetrics.dateRange.latest), "dd/MM/yyyy")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {canEdit && (
          <Button
            onClick={() => {
              setEditingEntry(undefined);
              setFormOpen(true);
            }}
            className="shrink-0"
          >
            <IconPlus className="mr-1.5 size-4" />
            Add Entry
          </Button>
        )}
      </div>

      {/* Fitness data table */}
      <TooltipProvider>
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="text-center font-semibold">Weight (kg)</TableHead>
                <TableHead className="text-center font-semibold">Body Fat (%)</TableHead>
                <TableHead className="font-semibold">Notes</TableHead>
                {canEdit && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {format(new Date(entry.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {entry.weightKg !== undefined
                      ? `${entry.weightKg.toFixed(1)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {entry.bodyFatPercentage !== undefined
                      ? `${entry.bodyFatPercentage.toFixed(1)}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <NotesCell notes={entry.notes} />
                  </TableCell>
                  {canEdit && (
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </TooltipProvider>

      {/* Dialogs */}
      {canEdit && (
        <>
          <FitnessFormDialog
            playerId={playerId}
            existingEntry={editingEntry}
            open={formOpen}
            onClose={() => {
              setFormOpen(false);
              setEditingEntry(undefined);
            }}
          />
          {deleteTarget && (
            <DeleteFitnessDialog
              fitnessId={deleteTarget._id}
              date={deleteTarget.date}
              open={!!deleteTarget}
              onClose={() => setDeleteTarget(undefined)}
            />
          )}
        </>
      )}
    </div>
  );
}

function NotesCell({ notes }: { notes?: string }) {
  if (!notes) return <span className="text-muted-foreground">—</span>;

  if (notes.length <= 60) {
    return <span>{notes}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{notes.slice(0, 60)}…</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <p>{notes}</p>
      </TooltipContent>
    </Tooltip>
  );
}
