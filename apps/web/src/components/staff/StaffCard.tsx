"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface StaffListItem {
  _id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  jobTitle: string;
  department: string;
  status: string;
}

interface DepartmentConfig {
  label: string;
  borderColor: string;
  gradient: string;
  textColor: string;
}

interface StaffCardProps {
  staff: StaffListItem;
  config: DepartmentConfig;
  onClick: (staffId: string) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export const StaffCard = React.memo(function StaffCard({
  staff,
  config,
  onClick,
}: StaffCardProps) {
  const isInactive = staff.status === "inactive";

  return (
    <button
      type="button"
      onClick={() => onClick(staff._id)}
      className={cn(
        "group relative flex w-full flex-col items-center overflow-hidden rounded-xl border border-border/60 border-t-4 bg-card shadow-sm transition-all hover:shadow-lg",
        config.borderColor,
        isInactive && "opacity-60",
      )}
    >
      {/* Gradient overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b",
          config.gradient,
        )}
      />

      {/* Department label — top-left, uppercase text */}
      <div className="relative z-10 self-start px-3 pt-2.5">
        <span
          className={cn(
            "text-[10px] font-extrabold tracking-wider",
            config.textColor,
          )}
        >
          {config.label}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative z-10 pb-3 pt-1">
        <Avatar className="size-16 shadow-md ring-2 ring-white dark:ring-border">
          {staff.photoUrl ? (
            <AvatarImage
              src={staff.photoUrl}
              alt={`${staff.firstName} ${staff.lastName}`}
            />
          ) : null}
          <AvatarFallback className="bg-muted text-base font-semibold">
            {getInitials(staff.firstName, staff.lastName)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Name */}
      <p className="relative z-10 px-2 text-sm leading-tight text-center">
        {staff.firstName}
        <br />
        <span className="font-extrabold">{staff.lastName}</span>
      </p>

      {/* Job title */}
      <p className="relative z-10 mt-1 px-3 text-xs text-muted-foreground">
        {staff.jobTitle}
      </p>

      {/* Inactive badge */}
      {isInactive && (
        <span className="relative z-10 mb-3 mt-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Inactive
        </span>
      )}

      {/* Spacer for active cards */}
      {!isInactive && <div className="pb-3" />}
    </button>
  );
});
