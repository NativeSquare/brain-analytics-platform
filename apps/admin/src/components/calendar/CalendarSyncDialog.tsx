"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the Convex HTTP endpoint (`.convex.site`) from the public API URL
 * (`.convex.cloud`). Falls back to the raw URL if it doesn't match.
 */
function getSiteUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  return convexUrl.replace(".convex.cloud", ".convex.site");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CalendarSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarSyncDialog({
  open,
  onOpenChange,
}: CalendarSyncDialogProps) {
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Data
  const feedToken = useQuery(api.calendar.queries.getFeedToken);
  const generateToken = useMutation(api.calendar.mutations.generateFeedToken);
  const regenerateToken = useMutation(
    api.calendar.mutations.regenerateFeedToken,
  );

  // Auto-generate token on dialog open if the user has none
  const [generating, setGenerating] = useState(false);

  async function ensureToken() {
    if (feedToken === null && !generating) {
      setGenerating(true);
      try {
        await generateToken();
      } finally {
        setGenerating(false);
      }
    }
  }

  // Trigger token generation when dialog opens and token is null
  if (open && feedToken === null && !generating) {
    ensureToken();
  }

  const feedUrl = feedToken
    ? `${getSiteUrl()}/api/calendar/${feedToken}`
    : "";

  // Handlers
  async function handleCopy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  }

  async function handleRegenerate() {
    try {
      await regenerateToken();
      setShowRegenConfirm(false);
      toast.success("Feed URL regenerated");
    } catch {
      toast.error("Failed to regenerate URL");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sync Calendar</DialogTitle>
            <DialogDescription>
              Subscribe to your team&apos;s events in your preferred calendar
              app.
            </DialogDescription>
          </DialogHeader>

          {/* Feed URL */}
          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="feed-url">
              Calendar Feed URL
            </label>
            <div className="flex gap-2">
              <Input
                id="feed-url"
                readOnly
                value={feedUrl}
                placeholder={feedToken === undefined ? "Loading..." : ""}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={!feedUrl}
                title="Copy URL"
              >
                <Copy className="size-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setShowRegenConfirm(true)}
              disabled={!feedToken}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Regenerate URL
            </Button>
          </div>

          <Separator />

          {/* Setup instructions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">How to Subscribe</h4>

            <div className="text-muted-foreground space-y-2 text-sm">
              <div>
                <span className="font-medium text-foreground">
                  Google Calendar:
                </span>{" "}
                Settings → Add other calendars → From URL → paste the feed
                URL.
              </div>
              <div>
                <span className="font-medium text-foreground">
                  Apple Calendar:
                </span>{" "}
                File → New Calendar Subscription → paste the feed URL.
              </div>
              <div>
                <span className="font-medium text-foreground">
                  Outlook:
                </span>{" "}
                Add calendar → Subscribe from web → paste the feed URL.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerate confirmation */}
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Feed URL?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new URL and{" "}
              <strong>
                the old URL will immediately stop working
              </strong>
              . You&apos;ll need to re-subscribe in your calendar app with the
              new URL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRegenerate}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
