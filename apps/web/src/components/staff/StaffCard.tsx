"use client";

import * as React from "react";
import type { StaffMember } from "@/lib/mock-data/staff-types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StaffDepartmentBadge } from "./StaffDepartmentBadge";
import { StaffStatusBadge } from "./StaffStatusBadge";
import type { StaffStatus } from "@packages/shared/staff";

interface StaffCardProps {
  staff: StaffMember;
  onClick: (staffId: string) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function StaffCard({ staff, onClick }: StaffCardProps) {
  const isInactive = staff.status === "inactive";

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${isInactive ? "opacity-60" : ""}`}
      onClick={() => onClick(staff._id)}
    >
      <CardContent className="flex flex-col items-center p-6 text-center">
        <Avatar className="size-16">
          {staff.photoUrl ? (
            <AvatarImage
              src={staff.photoUrl}
              alt={`${staff.firstName} ${staff.lastName}`}
            />
          ) : null}
          <AvatarFallback className="text-lg">
            {getInitials(staff.firstName, staff.lastName)}
          </AvatarFallback>
        </Avatar>
        <h3 className="mt-3 font-semibold">
          {staff.firstName} {staff.lastName}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">{staff.jobTitle}</p>
        <div className="mt-2 flex items-center gap-2">
          <StaffDepartmentBadge department={staff.department} />
          {isInactive && (
            <StaffStatusBadge status={staff.status as StaffStatus} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
