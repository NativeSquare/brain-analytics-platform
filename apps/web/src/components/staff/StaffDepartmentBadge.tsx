"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { StaffDepartment } from "@packages/shared/staff";

const DEPARTMENT_COLORS: Record<StaffDepartment, string> = {
  Coaching:
    "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400",
  Medical:
    "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400",
  Operations:
    "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400",
  Analytics:
    "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400",
  Management:
    "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-400",
  Academy:
    "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400",
};

export interface StaffDepartmentBadgeProps
  extends Omit<React.ComponentProps<"span">, "children"> {
  department: string;
}

function StaffDepartmentBadge({
  department,
  className,
  ...props
}: StaffDepartmentBadgeProps) {
  const colorClass =
    DEPARTMENT_COLORS[department as StaffDepartment] ?? "";

  return (
    <Badge
      variant="outline"
      className={cn(colorClass, className)}
      {...props}
    >
      {department}
    </Badge>
  );
}

export { StaffDepartmentBadge };
