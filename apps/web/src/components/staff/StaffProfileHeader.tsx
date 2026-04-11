"use client";

import React from "react";
import Link from "next/link";
import { IconArrowLeft, IconPencil } from "@tabler/icons-react";
import { UserX, UserCheck } from "lucide-react";
import type { StaffStatus } from "@packages/shared/staff";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StaffStatusBadge } from "./StaffStatusBadge";
import { StaffDepartmentBadge } from "./StaffDepartmentBadge";
import { StaffStatusChangeDialog } from "./StaffStatusChangeDialog";
import { useTranslation } from "@/hooks/useTranslation";

export interface StaffProfileData {
  _id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  jobTitle: string;
  department: string;
  status: string;
  phone?: string;
  email?: string;
  bio?: string;
  dateJoined?: number;
}

interface StaffProfileHeaderProps {
  staff: StaffProfileData;
  isAdmin: boolean;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export const StaffProfileHeader = React.memo(function StaffProfileHeader({
  staff,
  isAdmin,
}: StaffProfileHeaderProps) {
  const { t } = useTranslation();
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);

  const isActive = staff.status === "active";

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/staff">
          <IconArrowLeft className="mr-1 size-4" />
          {t.staff.backToStaff}
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-24">
            {staff.photoUrl ? (
              <AvatarImage
                src={staff.photoUrl}
                alt={`${staff.firstName} ${staff.lastName}`}
              />
            ) : null}
            <AvatarFallback className="text-2xl">
              {getInitials(staff.firstName, staff.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">
              {staff.firstName} {staff.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{staff.jobTitle}</span>
              <StaffDepartmentBadge department={staff.department} />
              <StaffStatusBadge status={staff.status as StaffStatus} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                variant={isActive ? "outline" : "default"}
                size="sm"
                onClick={() => setStatusDialogOpen(true)}
              >
                {isActive ? (
                  <>
                    <UserX className="mr-1 size-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-1 size-4" />
                    Reactivate
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/staff/${staff._id}/edit`}>
                  <IconPencil className="mr-1 size-4" />
                  {t.common.edit}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <StaffStatusChangeDialog
          staffId={staff._id as Id<"staff">}
          currentStatus={staff.status}
          staffName={`${staff.firstName} ${staff.lastName}`}
          open={statusDialogOpen}
          onClose={() => setStatusDialogOpen(false)}
        />
      )}
    </div>
  );
});
