"use client";

import * as React from "react";
import { IconUsersGroup } from "@tabler/icons-react";
import type { StaffMember } from "@/lib/mock-data/staff-types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffCard } from "./StaffCard";

interface StaffDirectoryGridProps {
  staff: StaffMember[];
  onStaffClick: (staffId: string) => void;
  isLoading: boolean;
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center p-6">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="mt-3 h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-24" />
        <Skeleton className="mt-2 h-5 w-20 rounded-full" />
      </CardContent>
    </Card>
  );
}

export function StaffDirectoryGrid({
  staff,
  onStaffClick,
  isLoading,
}: StaffDirectoryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {staff.map((member) => (
        <StaffCard key={member._id} staff={member} onClick={onStaffClick} />
      ))}
    </div>
  );
}
