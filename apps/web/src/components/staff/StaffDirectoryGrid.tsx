"use client";

import * as React from "react";
import { useMemo } from "react";
import { IconUsersGroup } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StaffCard } from "./StaffCard";
import type { StaffListItem } from "./StaffCard";

// ---------------------------------------------------------------------------
// Department groups — same visual pattern as player medical groups
// ---------------------------------------------------------------------------

const DEPARTMENT_GROUPS = [
  {
    key: "Coaching",
    label: "COACHING",
    borderColor: "border-t-blue-500",
    gradient: "from-blue-100/80 to-transparent dark:from-blue-900/20",
    textColor: "text-blue-600 dark:text-blue-400",
    accentColor: "bg-blue-500",
  },
  {
    key: "Medical",
    label: "MEDICAL",
    borderColor: "border-t-red-500",
    gradient: "from-red-100/80 to-transparent dark:from-red-900/20",
    textColor: "text-red-600 dark:text-red-400",
    accentColor: "bg-red-500",
  },
  {
    key: "Operations",
    label: "OPERATIONS",
    borderColor: "border-t-amber-500",
    gradient: "from-amber-100/80 to-transparent dark:from-amber-900/20",
    textColor: "text-amber-600 dark:text-amber-400",
    accentColor: "bg-amber-500",
  },
  {
    key: "Analytics",
    label: "ANALYTICS",
    borderColor: "border-t-purple-500",
    gradient: "from-purple-100/80 to-transparent dark:from-purple-900/20",
    textColor: "text-purple-600 dark:text-purple-400",
    accentColor: "bg-purple-500",
  },
  {
    key: "Management",
    label: "MANAGEMENT",
    borderColor: "border-t-slate-500",
    gradient: "from-slate-100/80 to-transparent dark:from-slate-900/20",
    textColor: "text-slate-600 dark:text-slate-400",
    accentColor: "bg-slate-500",
  },
  {
    key: "Academy",
    label: "ACADEMY",
    borderColor: "border-t-green-500",
    gradient: "from-green-100/80 to-transparent dark:from-green-900/20",
    textColor: "text-green-600 dark:text-green-400",
    accentColor: "bg-green-500",
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StaffDirectoryGridProps {
  staff: StaffListItem[];
  onStaffClick: (staffId: string) => void;
  isLoading: boolean;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border p-6">
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function StaffDirectoryGrid({
  staff,
  onStaffClick,
  isLoading,
}: StaffDirectoryGridProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, StaffListItem[]>();
    for (const member of staff) {
      const key = member.department;
      const list = map.get(key) ?? [];
      list.push(member);
      map.set(key, list);
    }
    return map;
  }, [staff]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g} className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-1 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16">
        <IconUsersGroup className="text-muted-foreground mb-4 size-12" />
        <h2 className="text-lg font-medium">No staff found</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {DEPARTMENT_GROUPS.map((group) => {
        const groupStaff = grouped.get(group.key);
        if (!groupStaff || groupStaff.length === 0) return null;

        return (
          <section key={group.key}>
            {/* Section header */}
            <div className="mb-4 flex items-center gap-3">
              <div className={cn("h-5 w-1 rounded-full", group.accentColor)} />
              <h2 className={cn("text-sm font-bold tracking-wider", group.textColor)}>
                {group.label}
              </h2>
              <span className="text-sm font-medium text-muted-foreground">
                {groupStaff.length}
              </span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {groupStaff.map((member) => (
                <StaffCard
                  key={member._id}
                  staff={member}
                  config={group}
                  onClick={onStaffClick}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
