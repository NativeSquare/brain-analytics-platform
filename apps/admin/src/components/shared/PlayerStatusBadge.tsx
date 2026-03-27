import * as React from "react";
import { cva } from "class-variance-authority";
import {
  CircleCheck,
  ArrowRightLeft,
  LogOut,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  PLAYER_STATUS_LABELS,
  type PlayerStatus,
} from "@packages/shared/players";

const statusBadgeVariants = cva("px-2.5 [&>svg]:size-3.5", {
  variants: {
    status: {
      active:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      onLoan:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      leftClub:
        "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    },
  },
});

const STATUS_ICONS: Record<PlayerStatus, LucideIcon> = {
  active: CircleCheck,
  onLoan: ArrowRightLeft,
  leftClub: LogOut,
};

export interface PlayerStatusBadgeProps
  extends Omit<React.ComponentProps<"span">, "children"> {
  status: PlayerStatus;
}

function PlayerStatusBadge({
  status,
  className,
  ...props
}: PlayerStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  const label = PLAYER_STATUS_LABELS[status];

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

export { PlayerStatusBadge };
