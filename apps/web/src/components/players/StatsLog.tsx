"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id, Doc } from "@packages/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import {
  IconChartBar,
  IconPlus,
  IconPencil,
  IconTrash,
  IconDots,
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

import { StatsFormDialog } from "./StatsFormDialog";
import { DeleteStatsDialog } from "./DeleteStatsDialog";

interface StatsLogProps {
  playerId: Id<"players">;
  isAdmin: boolean;
}

type PlayerStats = Doc<"playerStats">;

export function StatsLog({ playerId, isAdmin }: StatsLogProps) {
  const stats = useQuery(api.players.queries.getPlayerStats, { playerId });

  const [formOpen, setFormOpen] = useState(false);
  const [editingStats, setEditingStats] = useState<PlayerStats | undefined>(
    undefined
  );
  const [deleteTarget, setDeleteTarget] = useState<PlayerStats | undefined>(
    undefined
  );

  const summaryStats = useMemo(() => {
    if (!stats || stats.length === 0) return null;
    return {
      totalMatches: stats.length,
      totalGoals: stats.reduce((sum, s) => sum + s.goals, 0),
      totalAssists: stats.reduce((sum, s) => sum + s.assists, 0),
      totalYellowCards: stats.reduce((sum, s) => sum + s.yellowCards, 0),
      totalRedCards: stats.reduce((sum, s) => sum + s.redCards, 0),
      avgMinutes: Math.round(
        stats.reduce((sum, s) => sum + s.minutesPlayed, 0) / stats.length
      ),
    };
  }, [stats]);

  // Loading state
  if (stats === undefined) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Empty state
  if (stats.length === 0) {
    return (
      <div className="space-y-4">
        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={() => setFormOpen(true)}>
              <IconPlus className="mr-1.5 size-4" />
              Add Match Stats
            </Button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <IconChartBar className="text-muted-foreground mb-3 size-10" />
          <h3 className="text-lg font-medium">No match stats recorded yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin
              ? 'Click "Add Match Stats" to record a match performance.'
              : "Match stats will appear here once recorded."}
          </p>
        </div>
        {isAdmin && (
          <StatsFormDialog
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
      {/* Summary stats row */}
      {summaryStats && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div className="grid flex-1 grid-cols-3 gap-4 sm:grid-cols-6">
                <SummaryCard label="Matches" value={summaryStats.totalMatches} />
                <SummaryCard label="Goals" value={summaryStats.totalGoals} />
                <SummaryCard label="Assists" value={summaryStats.totalAssists} />
                <SummaryCard
                  label="Yellow Cards"
                  value={summaryStats.totalYellowCards}
                  color="text-yellow-500"
                />
                <SummaryCard
                  label="Red Cards"
                  value={summaryStats.totalRedCards}
                  color="text-red-500"
                />
                <SummaryCard
                  label="Avg Minutes"
                  value={summaryStats.avgMinutes}
                />
              </div>
              {isAdmin && (
                <Button
                  onClick={() => {
                    setEditingStats(undefined);
                    setFormOpen(true);
                  }}
                  className="ml-4 shrink-0"
                >
                  <IconPlus className="mr-1.5 size-4" />
                  Add Match Stats
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {!summaryStats && isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingStats(undefined);
              setFormOpen(true);
            }}
          >
            <IconPlus className="mr-1.5 size-4" />
            Add Match Stats
          </Button>
        </div>
      )}

      {/* Stats data table */}
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Opponent</TableHead>
                <TableHead className="text-center font-semibold">Minutes</TableHead>
                <TableHead className="text-center font-semibold">Goals</TableHead>
                <TableHead className="text-center font-semibold">Assists</TableHead>
                <TableHead className="text-center font-semibold">YC</TableHead>
                <TableHead className="text-center font-semibold">RC</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {format(new Date(entry.matchDate), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="font-semibold">{entry.opponent}</TableCell>
                  <TableCell className="text-center">
                    {entry.minutesPlayed}
                  </TableCell>
                  <TableCell className="text-center font-semibold">{entry.goals}</TableCell>
                  <TableCell className="text-center">{entry.assists}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-sm bg-yellow-400" />
                      {entry.yellowCards}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-sm bg-red-500" />
                      {entry.redCards}
                    </span>
                  </TableCell>
                  {isAdmin && (
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
                              setEditingStats(entry);
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

      {/* Dialogs */}
      {isAdmin && (
        <>
          <StatsFormDialog
            playerId={playerId}
            existingStats={editingStats}
            open={formOpen}
            onClose={() => {
              setFormOpen(false);
              setEditingStats(undefined);
            }}
          />
          {deleteTarget && (
            <DeleteStatsDialog
              statsId={deleteTarget._id}
              opponent={deleteTarget.opponent}
              matchDate={deleteTarget.matchDate}
              open={!!deleteTarget}
              onClose={() => setDeleteTarget(undefined)}
            />
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className={`text-2xl font-black tabular-nums ${color ?? "text-foreground"}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
