import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleCheck,
  ArrowRightLeft,
  LogOut,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type PlayerStatus = "active" | "on-loan" | "left-the-club";

const statusBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3.5 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      status: {
        active:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        "on-loan":
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        "left-the-club":
          "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
      },
    },
  }
);

const STATUS_CONFIG: Record<
  PlayerStatus,
  { label: string; icon: LucideIcon }
> = {
  active: { label: "Active", icon: CircleCheck },
  "on-loan": { label: "On Loan", icon: ArrowRightLeft },
  "left-the-club": { label: "Left the Club", icon: LogOut },
};

export interface StatusBadgeProps
  extends Omit<React.ComponentProps<"span">, "children"> {
  status: PlayerStatus;
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      <Icon />
      {config.label}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
