"use client";

import { createElement, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Plus, Pencil } from "lucide-react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getDashboardIcon, DASHBOARD_ICON_OPTIONS } from "@/lib/dashboard-icons";
import { USER_ROLES, ROLE_LABELS, type UserRole } from "@/utils/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "Match Analysis",
  "Season Analysis",
  "Player Analysis",
  "Tactical",
  "Set Pieces",
  "Opposition",
  "Trends",
  "Officials",
  "Possession",
] as const;

type Category = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ---------------------------------------------------------------------------
// Dashboard Form Dialog
// ---------------------------------------------------------------------------

interface DashboardFormData {
  title: string;
  description: string;
  category: Category;
  icon: string;
}

function DashboardFormDialog({
  mode,
  initialData,
  dashboardId,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  initialData?: DashboardFormData;
  dashboardId?: Id<"dashboards">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createDashboard = useMutation(api.dashboards.mutations.createDashboard);
  const updateDashboard = useMutation(api.dashboards.mutations.updateDashboard);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [category, setCategory] = useState<Category>(
    initialData?.category ?? "Match Analysis"
  );
  const [icon, setIcon] = useState(initialData?.icon ?? "Activity");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form state when the dialog opens (prevents stale data on re-open)
  useEffect(() => {
    if (open) {
      setTitle(initialData?.title ?? "");
      setDescription(initialData?.description ?? "");
      setCategory(initialData?.category ?? "Match Analysis");
      setIcon(initialData?.icon ?? "Activity");
      setSubmitting(false);
      setError(null);
    }
  }, [open, initialData]);

  const slug = generateSlug(title);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "create") {
        await createDashboard({ title, description, category, icon });
      } else if (dashboardId) {
        await updateDashboard({
          dashboardId,
          title,
          description,
          category,
          icon,
        });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Dashboard" : "Edit Dashboard"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new dashboard entry."
              : "Update the dashboard metadata."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            {title.trim() && (
              <p className="text-muted-foreground text-xs">
                Slug: <code className="rounded bg-muted px-1">{slug}</code>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as Category)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {DASHBOARD_ICON_OPTIONS.map((iconKey) => (
                  <SelectItem key={iconKey} value={iconKey}>
                    <span className="flex items-center gap-2">
                      {createElement(getDashboardIcon(iconKey), {
                        className: "size-4",
                      })}
                      {iconKey}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : mode === "create"
                  ? "Create"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// AdminDashboardsTab
// ---------------------------------------------------------------------------

export function AdminDashboardsTab() {
  const allDashboards = useQuery(api.dashboards.queries.getAllDashboards);
  const roleAssignments = useQuery(
    api.dashboards.queries.getAllRoleDashboardAssignments
  );
  const toggleAccess = useMutation(
    api.dashboards.mutations.toggleRoleDashboardAccess
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editDashboard, setEditDashboard] = useState<{
    id: Id<"dashboards">;
    data: DashboardFormData;
  } | null>(null);

  // Build assignment lookup: `${slug}:${role}` -> true
  const assignmentSet = useMemo(() => {
    if (!roleAssignments) return new Set<string>();
    return new Set(
      roleAssignments.map((a) => `${a.dashboardSlug}:${a.role}`)
    );
  }, [roleAssignments]);

  const handleToggle = (dashboardSlug: string, role: UserRole) => {
    void toggleAccess({ dashboardSlug, role });
  };

  if (allDashboards === undefined || roleAssignments === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const sortedDashboards = [...allDashboards].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dashboard Management</h2>
          <p className="text-muted-foreground text-sm">
            Configure which roles can access each dashboard.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Add Dashboard
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Icon</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Slug</TableHead>
              {USER_ROLES.map((role) => (
                <TableHead key={role} className="text-center text-xs">
                  {ROLE_LABELS[role]}
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDashboards.map((dashboard) => {
              const IconComp = getDashboardIcon(dashboard.icon);
              return (
                <TableRow key={dashboard._id}>
                  <TableCell>
                    {createElement(IconComp, { className: "size-4" })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {dashboard.title}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {dashboard.category}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs lg:table-cell">
                    {dashboard.slug}
                  </TableCell>
                  {USER_ROLES.map((role) => (
                    <TableCell key={role} className="text-center">
                      <Checkbox
                        checked={assignmentSet.has(
                          `${dashboard.slug}:${role}`
                        )}
                        onCheckedChange={() =>
                          handleToggle(dashboard.slug, role)
                        }
                        aria-label={`${ROLE_LABELS[role]} access to ${dashboard.title}`}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        setEditDashboard({
                          id: dashboard._id,
                          data: {
                            title: dashboard.title,
                            description: dashboard.description,
                            category: dashboard.category as Category,
                            icon: dashboard.icon,
                          },
                        })
                      }
                      aria-label={`Edit ${dashboard.title}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <DashboardFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* Edit dialog */}
      {editDashboard && (
        <DashboardFormDialog
          mode="edit"
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditDashboard(null);
          }}
          initialData={editDashboard.data}
          dashboardId={editDashboard.id}
        />
      )}
    </div>
  );
}
