"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import {
  IconAward,
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

import { CertificationFormDialog } from "./CertificationFormDialog";
import { DeleteCertificationDialog } from "./DeleteCertificationDialog";

interface CertificationLogProps {
  staffId: Id<"users">;
  canEdit: boolean;
}

type CertificationStatus = "valid" | "expiring" | "expired";

interface CertificationEntry {
  _id: Id<"certifications">;
  name: string;
  issuingBody: string;
  issueDate: number;
  expiryDate?: number;
  notes?: string;
  status: CertificationStatus;
}

// Status badge styling
const statusClasses: Record<CertificationStatus, string> = {
  valid:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expiring:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  expired:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusLabels: Record<CertificationStatus, string> = {
  valid: "Valid",
  expiring: "Expiring",
  expired: "Expired",
};

function StatusBadge({ status }: { status: CertificationStatus }) {
  return (
    <Badge variant="outline" className={statusClasses[status]}>
      {statusLabels[status]}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Memoized table row
// ---------------------------------------------------------------------------

const CertificationRow = React.memo(function CertificationRow({
  entry,
  canEdit,
  onEdit,
  onDelete,
}: {
  entry: CertificationEntry;
  canEdit: boolean;
  onEdit: (entry: CertificationEntry) => void;
  onDelete: (entry: CertificationEntry) => void;
}) {
  const handleEdit = useCallback(() => onEdit(entry), [onEdit, entry]);
  const handleDelete = useCallback(
    () => onDelete(entry),
    [onDelete, entry],
  );

  return (
    <TableRow>
      <TableCell className="font-medium">{entry.name}</TableCell>
      <TableCell>{entry.issuingBody}</TableCell>
      <TableCell>
        {format(new Date(entry.issueDate), "dd/MM/yyyy")}
      </TableCell>
      <TableCell>
        {entry.expiryDate
          ? format(new Date(entry.expiryDate), "dd/MM/yyyy")
          : "No expiry"}
      </TableCell>
      <TableCell>
        <StatusBadge status={entry.status} />
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
      )}
    </TableRow>
  );
});

export function CertificationLog({
  staffId,
  canEdit,
}: CertificationLogProps) {
  const entries = useQuery(api.staff.queries.getStaffCertifications, {
    staffId,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<
    CertificationEntry | undefined
  >(undefined);
  const [deleteTarget, setDeleteTarget] = useState<
    CertificationEntry | undefined
  >(undefined);

  const handleOpenCreate = useCallback(() => {
    setEditingEntry(undefined);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((entry: CertificationEntry) => {
    setEditingEntry(entry);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((entry: CertificationEntry) => {
    setDeleteTarget(entry);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingEntry(undefined);
  }, []);

  const handleDeleteClose = useCallback(() => {
    setDeleteTarget(undefined);
  }, []);

  // Summary stats
  const summary = useMemo(() => {
    if (!entries) return null;

    const valid = entries.filter((e) => e.status === "valid").length;
    const expiring = entries.filter((e) => e.status === "expiring").length;
    const expired = entries.filter((e) => e.status === "expired").length;

    return { valid, expiring, expired, total: entries.length };
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
            <Button onClick={handleOpenCreate}>
              <IconPlus className="mr-1.5 size-4" />
              Add Certification
            </Button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <IconAward className="text-muted-foreground mb-3 size-10" />
          <h3 className="text-lg font-medium">
            No certifications recorded
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {canEdit
              ? 'Click "Add Certification" to record a certification.'
              : "No certifications have been added yet."}
          </p>
        </div>
        <CertificationFormDialog
          staffId={staffId}
          open={formOpen}
          onClose={handleFormClose}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: summary + add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Total" value={String(summary.total)} />
            <SummaryCard
              label="Valid"
              value={String(summary.valid)}
              color="green"
            />
            <SummaryCard
              label="Expiring"
              value={String(summary.expiring)}
              color="amber"
            />
            <SummaryCard
              label="Expired"
              value={String(summary.expired)}
              color="red"
            />
          </div>
        )}
        {canEdit && (
          <Button onClick={handleOpenCreate} className="shrink-0">
            <IconPlus className="mr-1.5 size-4" />
            Add Certification
          </Button>
        )}
      </div>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Issuing Body</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <CertificationRow
                  key={entry._id}
                  entry={entry as CertificationEntry}
                  canEdit={canEdit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CertificationFormDialog
        staffId={staffId}
        existingCertification={editingEntry}
        open={formOpen}
        onClose={handleFormClose}
      />
      {deleteTarget && (
        <DeleteCertificationDialog
          certificationId={deleteTarget._id}
          certificationName={deleteTarget.name}
          open={!!deleteTarget}
          onClose={handleDeleteClose}
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
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "amber" | "red";
}) {
  const textColor =
    color === "green"
      ? "text-green-600 dark:text-green-400"
      : color === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : color === "red"
          ? "text-red-600 dark:text-red-400"
          : "";

  return (
    <Card>
      <CardContent className="px-3 py-2">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={`text-lg font-semibold ${textColor}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
