"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GraphInfoBadgeProps {
  text: string;
}

/**
 * Small "i" badge that shows a tooltip with chart methodology info.
 */
const GraphInfoBadge = ({ text }: GraphInfoBadgeProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Chart information"
          >
            <Info className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="max-w-xs text-xs leading-relaxed"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GraphInfoBadge;
