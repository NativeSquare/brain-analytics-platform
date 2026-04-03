"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const router = useRouter();
  const notifications = useQuery(api.notifications.queries.getAllNotifications);
  const markRead = useMutation(api.notifications.mutations.markRead);
  const markAllReadMutation = useMutation(
    api.notifications.mutations.markAllRead,
  );

  const handleClick = useCallback(
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
      toast.success("All notifications marked as read");
    } catch (error) {
      if (error instanceof ConvexError) {
        toast.error((error.data as { message: string }).message);
      }
    }
  }, [markAllReadMutation]);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <Check className="mr-2 size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="rounded-lg border">
        {notifications === undefined ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Inbox className="size-10" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => (
              <li key={notification._id}>
                <button
                  type="button"
                  onClick={() =>
                    handleClick(
                      notification._id,
                      notification.relatedEntityId,
                    )
                  }
                  className={cn(
                    "flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-accent",
                    !notification.read && "bg-muted/50",
                  )}
                >
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm leading-snug break-words",
                          !notification.read && "font-semibold",
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="mt-1.5 block size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground break-words">
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
    </div>
  );
}
