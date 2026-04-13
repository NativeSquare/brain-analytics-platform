"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { CircleCheck, CircleX, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  STAFF_STATUS_LABELS,
  type StaffStatus,
} from "@packages/shared/staff";

const statusBadgeVariants = cva("px-2.5 [&>svg]:size-3.5", {
  variants: {
    status: {
      active:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      inactive:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  },
});

const STATUS_ICONS: Record<StaffStatus, LucideIcon> = {
  active: CircleCheck,
  inactive: CircleX,
};

export interface StaffStatusBadgeProps
  extends Omit<React.ComponentProps<"span">, "children"> {
  status: StaffStatus;
}

function StaffStatusBadge({
  status,
  className,
  ...props
}: StaffStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  const label = STAFF_STATUS_LABELS[status];

  return (
    <Badge
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      <Icon />
      {label}
    </Badge>
  );
}

export { StaffStatusBadge };
