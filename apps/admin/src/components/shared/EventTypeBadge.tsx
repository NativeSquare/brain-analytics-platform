import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Trophy, Dumbbell, Users, Heart, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type EventType = "match" | "training" | "meeting" | "rehab";

// CVA variants for event-type-specific styles only.
// Base badge styles are inherited from the shadcn Badge component.
const eventTypeBadgeVariants = cva("", {
  variants: {
    eventType: {
      match:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      training:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      meeting:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      rehab:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    },
    size: {
      sm: "px-1.5 py-0.5 text-[10px] [&>svg]:size-3",
      default: "px-2.5 py-0.5 text-xs [&>svg]:size-3.5",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; icon: LucideIcon }
> = {
  match: { label: "Match", icon: Trophy },
  training: { label: "Training", icon: Dumbbell },
  meeting: { label: "Meeting", icon: Users },
  rehab: { label: "Rehab", icon: Heart },
};

export interface EventTypeBadgeProps
  extends Omit<React.ComponentProps<"span">, "children">,
    Omit<VariantProps<typeof eventTypeBadgeVariants>, "eventType"> {
  type: EventType;
}

function EventTypeBadge({
  type,
  size = "default",
  className,
  ...props
}: EventTypeBadgeProps) {
  const config = EVENT_TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <Badge
      data-event-type={type}
      className={cn(eventTypeBadgeVariants({ eventType: type, size }), className)}
      {...props}
    >
      <Icon />
      {config.label}
    </Badge>
  );
}

export { EventTypeBadge, eventTypeBadgeVariants };
