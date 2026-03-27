"use client";

import { useRouter } from "next/navigation";
import { IconBell } from "@tabler/icons-react";
import { Check, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

import { api } from "@packages/backend/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

function NotificationCenter() {
  const router = useRouter();

  const unreadCount = useQuery(api.notifications.queries.getUnreadCount);
  const notifications = useQuery(
    api.notifications.queries.getUserNotifications,
  );

  const markRead = useMutation(api.notifications.mutations.markRead);
  const markAllReadMutation = useMutation(
    api.notifications.mutations.markAllRead,
  );

  const handleNotificationClick = async (
    notificationId: string,
    relatedEntityId?: string,
  ) => {
    try {
      await markRead({
        notificationId: notificationId as any,
      });
    } catch (error) {
      if (error instanceof ConvexError) {
        toast.error((error.data as { message: string }).message);
      }
    }

    if (relatedEntityId) {
      router.push("/calendar");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation();
    } catch (error) {
      if (error instanceof ConvexError) {
        toast.error((error.data as { message: string }).message);
      }
    }
  };

  const displayCount =
    unreadCount === undefined
      ? 0
      : unreadCount > 9
        ? "9+"
        : unreadCount;

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
          {unreadCount !== undefined && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]"
            >
              {displayCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
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

        {/* Notification list */}
        <ScrollArea className="max-h-80">
          {!notifications || notifications.length === 0 ? (
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
    </Popover>
  );
}

export { NotificationCenter };
