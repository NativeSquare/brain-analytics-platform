"use client";

import { useQuery } from "convex/react";
import { ChevronDown } from "lucide-react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RsvpResponse {
  userId: string;
  status: string;
  reason?: string;
  respondedAt: number;
  fullName: string;
  avatarUrl: string | null;
}

interface PendingUser {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

interface AdminRsvpData {
  responses: RsvpResponse[];
  pending: PendingUser[];
  summary: { attending: number; notAttending: number; pending: number; total: number };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RSVPOverviewProps {
  eventId: Id<"calendarEvents">;
  /** Whether the current user is an admin. Determines if detailed response list is shown. */
  isAdmin?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface UserRowProps {
  fullName: string;
  avatarUrl: string | null;
  reason?: string;
}

function UserRow({ fullName, avatarUrl, reason }: UserRowProps) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Avatar className="size-7">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
        <AvatarFallback className="text-xs">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{fullName}</p>
        {reason && (
          <p className="text-muted-foreground truncate text-xs">
            {reason}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RSVPOverview({ eventId, isAdmin }: RSVPOverviewProps) {
  const rsvpData = useQuery(api.calendar.queries.getEventRsvps, { eventId });

  // Loading state — show skeleton for all users (summary counts are visible to everyone)
  if (rsvpData === undefined) {
    return (
      <div className="space-y-3 border-t pt-4">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    );
  }

  const { summary } = rsvpData;

  // Check if admin response shape (has responses array)
  const isAdminData = isAdmin && "responses" in rsvpData;
  const adminData = isAdminData ? (rsvpData as unknown as AdminRsvpData) : null;
  const responses = adminData?.responses ?? [];
  const pendingUsers = adminData?.pending ?? [];

  const attending = responses.filter((r) => r.status === "attending");
  const notAttending = responses.filter(
    (r) => r.status === "not_attending",
  );

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">RSVP Responses</p>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        >
          {summary.attending} Attending
        </Badge>
        <Badge
          variant="outline"
          className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          {summary.notAttending} Not Attending
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          {summary.pending} Pending
        </Badge>
      </div>

      {/* Detailed response list (admin only) */}
      {isAdminData && (
        <div className="space-y-2">
          {/* Attending group */}
          {attending.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium">
                <ChevronDown className="text-muted-foreground size-4 transition-transform [[data-state=open]>&]:rotate-180" />
                Attending ({attending.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6">
                {attending.map((r) => (
                  <UserRow
                    key={r.userId}
                    fullName={r.fullName}
                    avatarUrl={r.avatarUrl}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Not Attending group */}
          {notAttending.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium">
                <ChevronDown className="text-muted-foreground size-4 transition-transform [[data-state=open]>&]:rotate-180" />
                Not Attending ({notAttending.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6">
                {notAttending.map((r) => (
                  <UserRow
                    key={r.userId}
                    fullName={r.fullName}
                    avatarUrl={r.avatarUrl}
                    reason={r.reason}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Pending group */}
          {pendingUsers.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium">
                <ChevronDown className="text-muted-foreground size-4 transition-transform [[data-state=open]>&]:rotate-180" />
                Pending ({pendingUsers.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6">
                {pendingUsers.map((u) => (
                  <UserRow
                    key={u.userId}
                    fullName={u.fullName}
                    avatarUrl={u.avatarUrl}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
