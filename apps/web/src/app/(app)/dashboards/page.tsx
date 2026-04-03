"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCardItem } from "@/components/dashboard/dashboard-card-item";
import { DashboardGalleryGrid } from "@/components/dashboard/dashboard-gallery-grid";
import { ROLE_LABELS, type UserRole } from "@/utils/roles";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_CATEGORIES = "all";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  // Convex queries
  const dashboards = useQuery(api.dashboards.queries.getDashboardsForRole);
  const pinnedDashboards = useQuery(
    api.userDashboards.getUserPinnedDashboards
  );
  const roleAssignments = useQuery(
    api.dashboards.queries.getAllRoleDashboardAssignments
  );

  // Mutations
  const togglePin = useMutation(api.userDashboards.togglePinDashboard);

  // Build set of pinned dashboard slugs
  const pinnedSlugs = useMemo(() => {
    if (!pinnedDashboards) return new Set<string>();
    return new Set(pinnedDashboards.map((p) => p.dashboardId));
  }, [pinnedDashboards]);

  // Build role map: slug -> role labels
  const rolesBySlug = useMemo(() => {
    if (!roleAssignments) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const assignment of roleAssignments) {
      const existing = map.get(assignment.dashboardSlug) ?? [];
      const label =
        ROLE_LABELS[assignment.role as UserRole] ?? assignment.role;
      if (!existing.includes(label)) {
        existing.push(label);
      }
      map.set(assignment.dashboardSlug, existing);
    }
    return map;
  }, [roleAssignments]);

  // Extract unique categories from the data
  const categories = useMemo(() => {
    if (!dashboards) return [];
    const cats = new Set(dashboards.map((d) => d.category));
    return Array.from(cats).sort();
  }, [dashboards]);

  // Filter + sort dashboards
  const filteredDashboards = useMemo(() => {
    if (!dashboards) return [];

    let result = dashboards;

    // Search filter
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((d) =>
        d.title.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== ALL_CATEGORIES) {
      result = result.filter((d) => d.category === categoryFilter);
    }

    // Sort: pinned first (by pinnedAt desc), then alphabetical
    const pinned = result
      .filter((d) => pinnedSlugs.has(d.slug))
      .sort((a, b) => {
        const pinA =
          pinnedDashboards?.find((p) => p.dashboardId === a.slug)
            ?.pinnedAt ?? 0;
        const pinB =
          pinnedDashboards?.find((p) => p.dashboardId === b.slug)
            ?.pinnedAt ?? 0;
        return pinB - pinA;
      });

    const unpinned = result
      .filter((d) => !pinnedSlugs.has(d.slug))
      .sort((a, b) => a.title.localeCompare(b.title));

    return [...pinned, ...unpinned];
  }, [dashboards, search, categoryFilter, pinnedSlugs, pinnedDashboards]);

  const handlePinToggle = (dashboardSlug: string) => {
    void togglePin({ dashboardId: dashboardSlug });
  };

  // Loading state
  if (dashboards === undefined) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="px-4 lg:px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Header */}
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold">Dashboards</h1>
        <p className="text-muted-foreground text-sm">
          Browse and access your analytics dashboards.
        </p>
      </div>

      {/* Search & filter controls */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center lg:px-6">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search dashboards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dashboard grid */}
      <div className="px-4 lg:px-6">
        {filteredDashboards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">
              {dashboards.length === 0
                ? "No dashboards available for your role."
                : "No dashboards match your search criteria."}
            </p>
          </div>
        ) : (
          <DashboardGalleryGrid>
            {filteredDashboards.map((dashboard) => (
              <DashboardCardItem
                key={dashboard.slug}
                slug={dashboard.slug}
                title={dashboard.title}
                description={dashboard.description}
                icon={dashboard.icon}
                allowedRoles={rolesBySlug.get(dashboard.slug) ?? []}
                isPinned={pinnedSlugs.has(dashboard.slug)}
                onPinToggle={handlePinToggle}
              />
            ))}
          </DashboardGalleryGrid>
        )}
      </div>
    </div>
  );
}
