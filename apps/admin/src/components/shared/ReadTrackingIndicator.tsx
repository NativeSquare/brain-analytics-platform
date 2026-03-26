"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export interface ReadTrackingIndicatorProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  opened: number;
  total: number;
  compact?: boolean;
}

function ReadTrackingIndicator({
  opened,
  total,
  compact = false,
  className,
  ...props
}: ReadTrackingIndicatorProps) {
  if (total === 0) {
    return (
      <div
        data-slot="read-tracking-indicator"
        className={cn(
          "text-muted-foreground",
          compact
            ? "inline-flex items-center gap-1.5 text-xs"
            : "flex flex-col gap-1.5 text-sm",
          className
        )}
        {...props}
      >
        <EyeOff className={compact ? "size-3" : "size-4"} />
        <span>No access</span>
      </div>
    );
  }

  const percentage = Math.round((opened / total) * 100);

  if (compact) {
    return (
      <div
        data-slot="read-tracking-indicator"
        className={cn(
          "inline-flex items-center gap-2 text-xs text-muted-foreground",
          className
        )}
        {...props}
      >
        <Eye className="size-3 shrink-0" />
        <span className="whitespace-nowrap">
          {opened}/{total}
        </span>
        <Progress value={percentage} className="h-1 w-16" />
      </div>
    );
  }

  return (
    <div
      data-slot="read-tracking-indicator"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Eye className="size-4 shrink-0" />
        <span>
          Opened by {opened}/{total}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

export { ReadTrackingIndicator };
