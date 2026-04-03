"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Inbox, Loader2 } from "lucide-react";
import { IconBell } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { api } from "@packages/backend/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

function NotificationCenter() {
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <IconBell className="h-4 w-4" />
          {!!displayCount && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
            >
              {displayCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="flex w-80 flex-col overflow-hidden p-0" style={{ maxHeight: "400px" }}>
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
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

        <div className="min-h-0 flex-1 overflow-y-auto">
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
                    <div className="mt-1.5 w-2 shrink-0">
                      {!notification.read && (
                        <span className="block size-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug break-words">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground break-words">
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
        </div>

        <div className="shrink-0 border-t px-4 py-2">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push("/notifications");
            }}
            className="w-full text-center text-xs font-medium text-primary hover:underline"
          >
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { NotificationCenter };
