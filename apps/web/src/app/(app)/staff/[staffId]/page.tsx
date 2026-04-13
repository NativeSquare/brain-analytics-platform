"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { IconArrowLeft } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffProfileHeader } from "@/components/staff/StaffProfileHeader";
import { StaffProfileTabs } from "@/components/staff/StaffProfileTabs";
import { InviteStaffDialog } from "@/components/staff/InviteStaffDialog";
import { useTranslation } from "@/hooks/useTranslation";

interface StaffProfilePageProps {
  params: Promise<{ staffId: string }>;
}

export default function StaffProfilePage({ params }: StaffProfilePageProps) {
  const { staffId } = use(params);
  const typedStaffId = staffId as Id<"staff">;
  const { t } = useTranslation();

  const staff = useQuery(api.staff.queries.getStaffById, {
    staffId: typedStaffId,
  });
  const currentUser = useQuery(api.table.users.currentUser);
  const inviteStatus = useQuery(api.staff.queries.getStaffInviteStatus, {
    staffId: typedStaffId,
  });

  const isAdmin = currentUser?.role === "admin";
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Loading state
  if (staff === undefined) {
    return <ProfileSkeleton />;
  }

  // Not found state
  if (staff === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <h2 className="text-lg font-medium">{t.staff.notFound}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t.staff.notFoundDescription}
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/staff">
            <IconArrowLeft className="mr-1.5 size-4" />
            {t.staff.backToStaff}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <StaffProfileHeader
        staff={staff}
        isAdmin={isAdmin}
        inviteStatus={inviteStatus}
        onInviteClick={() => setInviteDialogOpen(true)}
      />
      <StaffProfileTabs
        staff={staff}
        isAdmin={isAdmin}
        currentUserId={currentUser?._id}
      />

      {isAdmin && (
        <InviteStaffDialog
          firstName={staff.firstName}
          lastName={staff.lastName}
          email={staff.email}
          department={staff.department}
          open={inviteDialogOpen}
          onClose={() => setInviteDialogOpen(false)}
        />
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Back button skeleton */}
      <Skeleton className="h-8 w-32" />

      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-24 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
