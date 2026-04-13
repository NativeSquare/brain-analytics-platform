"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
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
  IconTable,
  IconTimeline,
  IconChevronDown,
  IconChevronRight,
  IconArrowRight,
} from "@tabler/icons-react";
import {
  BODY_REGION_LABELS,
  INJURY_MECHANISM_LABELS,
  INJURY_SIDE_LABELS,
} from "@packages/shared/players";
import type { BodyRegion, InjuryMechanism, InjurySide } from "@packages/shared/players";

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

import { useTranslation } from "@/hooks/useTranslation";
import { InjuryFormDialog } from "./InjuryFormDialog";
import { DeleteInjuryDialog } from "./DeleteInjuryDialog";
import { InjuryTimeline } from "./InjuryTimeline";
import { RehabNotesSection } from "./RehabNotesSection";
import { RtpStatusBadge } from "./rtp-status";
import { RtpStatusDialog } from "./RtpStatusDialog";

interface InjuryLogProps {
  playerId: Id<"players">;
}

type PlayerInjury = Doc<"playerInjuries">;

// Badge styling maps (AC #3, updated Story 14.2: minor = green per Epic 14 spec)
const severityClasses: Record<string, string> = {
  minor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  moderate: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  severe: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

/**
 * Check if a status represents an active (non-cleared) injury.
 */
function isActiveStatus(status: string): boolean {
  return status !== "cleared" && status !== "recovered";
}

// ---------------------------------------------------------------------------
// Memoized table row to prevent re-renders when sibling rows change.
// ---------------------------------------------------------------------------

const InjuryRow = React.memo(function InjuryRow({
  entry,
  onEdit,
  onDelete,
  onChangeStatus,
  isExpanded,
  onToggleExpand,
}: {
  entry: PlayerInjury;
  onEdit: (entry: PlayerInjury) => void;
  onDelete: (entry: PlayerInjury) => void;
  onChangeStatus: (entry: PlayerInjury) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const handleEdit = useCallback(() => onEdit(entry), [onEdit, entry]);
  const handleDelete = useCallback(() => onDelete(entry), [onDelete, entry]);
  const handleChangeStatus = useCallback(() => onChangeStatus(entry), [onChangeStatus, entry]);
  const handleToggle = useCallback(() => onToggleExpand(entry._id), [onToggleExpand, entry._id]);

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={handleToggle}
      >
        <TableCell className="w-8">
          {isExpanded ? (
            <IconChevronDown className="text-muted-foreground size-4" />
          ) : (
            <IconChevronRight className="text-muted-foreground size-4" />
          )}
        </TableCell>
        <TableCell>
          {format(new Date(entry.date), "dd/MM/yyyy")}
        </TableCell>
        <TableCell>
          <NotesCell text={entry.injuryType} maxLen={40} />
        </TableCell>
        <TableCell>
          {entry.bodyRegion
            ? BODY_REGION_LABELS[entry.bodyRegion as BodyRegion] ?? entry.bodyRegion
            : "\u2014"}
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={severityClasses[entry.severity] ?? ""}
          >
            {entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1)}
          </Badge>
        </TableCell>
        <TableCell>
          {entry.mechanism
            ? INJURY_MECHANISM_LABELS[entry.mechanism as InjuryMechanism] ?? entry.mechanism
            : "\u2014"}
        </TableCell>
        <TableCell>
          {entry.side
            ? INJURY_SIDE_LABELS[entry.side as InjurySide] ?? entry.side
            : "\u2014"}
        </TableCell>
        <TableCell>
          <RtpStatusBadge status={entry.status} />
        </TableCell>
        <TableCell>
          {entry.expectedReturnDate
            ? format(new Date(entry.expectedReturnDate), "dd/MM/yyyy")
            : "\u2014"}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <IconDots className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleChangeStatus}>
                <IconArrowRight className="mr-2 size-4" />
                Change Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <IconPencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDelete}
              >
                <IconTrash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-4">
            <RehabNotesSection injuryId={entry._id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

type ViewMode = "table" | "timeline";

export function InjuryLog({ playerId }: InjuryLogProps) {
  const { t } = useTranslation();
  const entries = useQuery(api.players.queries.getPlayerInjuries, { playerId });

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlayerInjury | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<PlayerInjury | undefined>(undefined);
  const [statusTarget, setStatusTarget] = useState<PlayerInjury | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [expandedInjuryId, setExpandedInjuryId] = useState<string | null>(null);

  // Memoized callbacks to avoid re-creating on every render
  const handleOpenCreate = useCallback(() => {
    setEditingEntry(undefined);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((entry: PlayerInjury) => {
    setEditingEntry(entry);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((entry: PlayerInjury) => {
    setDeleteTarget(entry);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingEntry(undefined);
  }, []);

  const handleDeleteClose = useCallback(() => {
    setDeleteTarget(undefined);
  }, []);

  const handleChangeStatus = useCallback((entry: PlayerInjury) => {
    setStatusTarget(entry);
  }, []);

  const handleStatusClose = useCallback(() => {
    setStatusTarget(undefined);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedInjuryId((prev) => (prev === id ? null : id));
  }, []);

  // Story 14.1 AC #8: Updated summary computation
  const summary = useMemo(() => {
    if (!entries) return null;

    const active = entries.filter((e) => isActiveStatus(e.status));
    const cleared = entries.filter((e) => !isActiveStatus(e.status));

    return {
      activeCount: active.length,
      clearedCount: cleared.length,
      totalCount: entries.length,
      activeInjuries: active,
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
          <Button onClick={handleOpenCreate}>
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
          onClose={handleFormClose}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary + controls */}
      {summary && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div className="grid flex-1 grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center">
                  <p className={`text-2xl font-black tabular-nums ${summary.activeCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{summary.activeCount}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Injuries</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="text-2xl font-black tabular-nums text-green-600 dark:text-green-400">{summary.clearedCount}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cleared</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <p className="text-2xl font-black tabular-nums text-foreground">{summary.totalCount}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Records</p>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2 shrink-0">
          {/* Story 14.2: Table/Timeline view toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("table")}
            >
              <IconTable className="mr-1.5 size-4" />
              {t.injuryTimeline.viewTable}
            </Button>
            <Button
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("timeline")}
            >
              <IconTimeline className="mr-1.5 size-4" />
              {t.injuryTimeline.viewTimeline}
            </Button>
          </div>
          <Button
            onClick={handleOpenCreate}
          >
            <IconPlus className="mr-1.5 size-4" />
            Log Injury
          </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Active injury badges */}
      {summary && summary.activeInjuries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.activeInjuries.map((inj) => (
            <Badge key={inj._id} variant="destructive" className="text-xs">
              {inj.injuryType} — {format(new Date(inj.date), "dd/MM/yyyy")}
            </Badge>
          ))}
        </div>
      )}

      {/* Story 14.2: Conditional view rendering */}
      {viewMode === "timeline" ? (
        <InjuryTimeline injuries={entries} />
      ) : (
        /* Story 14.1 AC #8: Extended injury data table */
        <TooltipProvider>
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-8" />
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Injury Type</TableHead>
                    <TableHead className="font-semibold">Body Region</TableHead>
                    <TableHead className="font-semibold">Severity</TableHead>
                    <TableHead className="font-semibold">Mechanism</TableHead>
                    <TableHead className="font-semibold">Side</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Est. Return</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <InjuryRow
                      key={entry._id}
                      entry={entry}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onChangeStatus={handleChangeStatus}
                      isExpanded={expandedInjuryId === entry._id}
                      onToggleExpand={handleToggleExpand}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TooltipProvider>
      )}

      {/* Dialogs */}
      <InjuryFormDialog
        playerId={playerId}
        existingEntry={editingEntry}
        open={formOpen}
        onClose={handleFormClose}
      />
      {deleteTarget && (
        <DeleteInjuryDialog
          injuryId={deleteTarget._id}
          date={deleteTarget.date}
          open={!!deleteTarget}
          onClose={handleDeleteClose}
        />
      )}
      {statusTarget && (
        <RtpStatusDialog
          injuryId={statusTarget._id}
          currentStatus={statusTarget.status}
          open={!!statusTarget}
          onClose={handleStatusClose}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------


function NotesCell({ text, maxLen }: { text: string; maxLen: number }) {
  if (text.length <= maxLen) {
    return <span>{text}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{text.slice(0, maxLen)}&hellip;</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
