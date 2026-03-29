"use client";

/* [Sprint 3 — Story 3.7] Full notification center commented out until Sprint 3 delivery.
 * Bell icon + placeholder dropdown kept visible (client already informed notifications are in progress).
 * To restore: uncomment the original imports/logic below and remove the placeholder.
 */

import { IconBell } from "@tabler/icons-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

/* [Sprint 3 — Story 3.7] Original imports — uncomment when restoring
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { api } from "@packages/backend/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
*/

function NotificationCenter() {
  /* [Sprint 3 — Story 3.7] Original logic — uncomment when restoring
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = useQuery(api.notifications.queries.getUnreadCount);
  const notifications = useQuery(
    api.notifications.queries.getUserNotifications,
    isOpen ? {} : "skip",
  );

  const markRead = useMutation(api.notifications.mutations.markRead);
  const markAllReadMutation = useMutation(
    api.notifications.mutations.markAllRead,
  );

  const handleNotificationClick = useCallback(
    async (
      notificationId: Id<"notifications">,
      relatedEntityId?: string,
    ) => {
      try {
        await markRead({ notificationId });
      } catch (error) {
        if (error instanceof ConvexError) {
          toast.error((error.data as { message: string }).message);
        }
      }

      if (relatedEntityId) {
        router.push("/calendar");
      }
    },
    [markRead, router],
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllReadMutation();
    } catch (error) {
      if (error instanceof ConvexError) {
        toast.error((error.data as { message: string }).message);
      }
    }
  }, [markAllReadMutation]);

  const displayCount =
    unreadCount === undefined
      ? 0
      : unreadCount > 9
        ? "9+"
        : unreadCount;
  */

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <IconBell className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <Inbox className="size-8" />
          <p className="text-sm">Notifications will be available soon</p>
        </div>
      </PopoverContent>

      {/* [Sprint 3 — Story 3.7] Original popover content — uncomment when restoring
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount !== undefined && unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Check className="size-3" />
              Mark all as read
            </button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications === undefined ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <Inbox className="size-8" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li key={notification._id}>
                  <button
                    type="button"
                    onClick={() =>
                      handleNotificationClick(
                        notification._id,
                        notification.relatedEntityId,
                      )
                    }
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                      !notification.read && "bg-muted",
                    )}
                  >
                    <div className="mt-1.5 shrink-0">
                      {!notification.read && (
                        <span className="block size-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {notification.title}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
      */}
    </Popover>
  );
}

export { NotificationCenter };
