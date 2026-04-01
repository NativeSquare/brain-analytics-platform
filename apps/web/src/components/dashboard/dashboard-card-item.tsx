"use client";

import { createElement } from "react";
import Link from "next/link";
import { Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardIcon } from "@/lib/dashboard-icons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardCardItemProps {
  /** Unique identifier (slug) for the dashboard. */
  slug: string;
  /** Display title. */
  title: string;
  /** Optional description text. */
  description?: string | null;
  /** Icon key that maps to a Lucide icon via `getDashboardIcon`. */
  icon?: string | null;
  /** Roles that have access to this dashboard. */
  allowedRoles?: string[];
  /** Whether the current user has pinned this dashboard. */
  isPinned?: boolean;
  /** Callback fired when the pin button is clicked. Receives the dashboard slug. */
  onPinToggle?: (dashboardId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardCardItem({
  slug,
  title,
  description,
  icon,
  allowedRoles = [],
  isPinned = false,
  onPinToggle,
}: DashboardCardItemProps) {
  // Use createElement to render the dynamic icon — avoids the React compiler
  // "Cannot create components during render" error that occurs when a
  // dynamically-resolved component is used in JSX syntax.
  const iconElement = createElement(getDashboardIcon(icon), {
    className: "size-4",
  });

  const handlePinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPinToggle?.(slug);
  };

  return (
    <Link href={`/dashboards/${slug}`} className="group block">
      <Card className="relative h-full border-border/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
        {/* Pin toggle button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePinClick}
          className={`absolute right-3 top-3 z-10 size-8 rounded-full ${
            isPinned
              ? "text-primary"
              : "text-muted-foreground/50 hover:text-primary"
          }`}
          aria-label={isPinned ? "Unpin dashboard" : "Pin dashboard"}
        >
          <Pin className={`size-4 ${isPinned ? "fill-current" : ""}`} />
        </Button>

        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            {/* Icon badge */}
            <div className="rounded-md bg-primary/15 p-2 text-primary">
              {iconElement}
            </div>
            {allowedRoles.length > 0 && (
              <Badge variant="outline" className="mr-8">
                {allowedRoles.length}{" "}
                {allowedRoles.length === 1 ? "role" : "roles"}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl group-hover:text-primary">
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>

        {allowedRoles.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {allowedRoles.map((role) => (
              <Badge key={`${slug}-${role}`} variant="secondary">
                {role}
              </Badge>
            ))}
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
