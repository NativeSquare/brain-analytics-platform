"use client";

import { Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { StaffDirectoryFilters } from "@/components/staff/StaffDirectoryFilters";
import { StaffDirectoryGrid } from "@/components/staff/StaffDirectoryGrid";
import { CertificationAlerts } from "@/components/staff/CertificationAlerts";
import { useStaffDirectory } from "@/hooks/useStaffDirectory";

function StaffDirectoryContent() {
  const router = useRouter();
  const currentUser = useQuery(api.table.users.currentUser);
  const isAdmin = currentUser?.role === "admin";
  const {
    filteredStaff,
    searchTerm,
    setSearchTerm,
    department,
    setDepartment,
    role,
    setRole,
    departments,
    roles,
    isLoading,
  } = useStaffDirectory();

  const handleStaffClick = useCallback(
    (staffId: string) => {
      router.push(`/staff/${staffId}`);
    },
    [router],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Staff Directory</h1>
        <Badge variant="secondary">{filteredStaff.length}</Badge>
      </div>

      {/* Admin certification alerts */}
      {isAdmin && <CertificationAlerts />}

      {/* Filters */}
      <StaffDirectoryFilters
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        department={department}
        onDepartmentChange={setDepartment}
        role={role}
        onRoleChange={setRole}
        departments={departments}
        roles={roles}
      />

      {/* Staff grid */}
      <StaffDirectoryGrid
        staff={filteredStaff}
        onStaffClick={handleStaffClick}
        isLoading={isLoading}
      />
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col items-center p-6">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="mt-3 h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-24" />
              <Skeleton className="mt-2 h-5 w-20 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <StaffDirectoryContent />
    </Suspense>
  );
}
