"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { PitchEvent } from "./types";
import {
  describeLocation,
  formatMinute,
  parseTimestamp,
} from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WyscoutOffsets = Record<string, { start: number; end: number }>;

interface EventDetailsPaneProps {
  event: PitchEvent | null;
  matchId: number | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventDetailsPane({
  event,
  matchId,
  onClose,
}: EventDetailsPaneProps) {
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Reset video on event change
  useEffect(() => {
    setVideoUrl(null);
    setMuxPlaybackId(null);
    setVideoError(null);
  }, [event?.id]);

  const applyPeriodOffset = (
    timestampSeconds: number,
    period: number,
    offsets: WyscoutOffsets,
  ): number => {
    if (period === 2 && Number(offsets["2H"]?.start)) {
      return timestampSeconds + offsets["2H"].start;
    }
    if (period === 3 && Number(offsets["E1"]?.start)) {
      return timestampSeconds + offsets["E1"].start;
    }
    if (period === 4 && Number(offsets["E2"]?.start)) {
      return timestampSeconds + offsets["E2"].start;
    }
    return timestampSeconds;
  };

  const handleWatchVideo = async () => {
    if (!event) return;
    const eventMatchId = event.match_id ?? matchId;
    if (!eventMatchId || !event.timestamp) {
      setVideoError("Match ID or timestamp is missing");
      return;
    }

    setVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null);
    setMuxPlaybackId(null);

    try {
      // 1. Resolve Wyscout match ID
      const matchIdRes = await fetch(
        `/api/wyscout/match-id?statsbomb_match_id=${eventMatchId}`,
      );
      if (!matchIdRes.ok) throw new Error("Failed to fetch Wyscout match ID");
      const matchIdData = (await matchIdRes.json()) as {
        wyscoutMatchId: string | null;
      };
      if (!matchIdData.wyscoutMatchId)
        throw new Error("Wyscout match ID not found");

      // 2. Get offsets
      const offsetsRes = await fetch(
        `/api/wyscout/offsets?wyscout_match_id=${matchIdData.wyscoutMatchId}`,
      );
      if (!offsetsRes.ok) throw new Error("Failed to fetch offsets");
      const offsetsData = (await offsetsRes.json()) as {
        offsets: { offsets: WyscoutOffsets };
      };
      const offsets = offsetsData.offsets?.offsets ?? {};

      // 3. Calculate timestamp window
      const ts = parseTimestamp(event.timestamp);
      if (ts === null) throw new Error("Invalid timestamp format");
      const adjusted = applyPeriodOffset(ts, event.period, offsets);
      const startTimestamp = Math.floor(adjusted - 5);
      const endTimestamp = Math.ceil(adjusted + 5);

      // 4. Fetch video URL
      const videoRes = await fetch(
        `/api/wyscout/urls?wyscout_match_id=${matchIdData.wyscoutMatchId}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`,
      );
      if (!videoRes.ok) {
        const errorData = (await videoRes.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to fetch video URL");
      }

      const videoData = (await videoRes.json()) as {
        url: string | null;
        muxPlaybackId?: string;
      };
      setVideoUrl(videoData.url);
      setMuxPlaybackId(videoData.muxPlaybackId ?? null);
    } catch (error) {
      setVideoError(
        error instanceof Error ? error.message : "Failed to fetch video",
      );
    } finally {
      setVideoLoading(false);
    }
  };

  if (!event) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="text-sm font-semibold uppercase">Details</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Select an event on the pitch to view details
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold uppercase">Event Details</span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Event info */}
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Player</span>
          <span className="font-medium">{event.player_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Team</span>
          <span className="font-medium">{event.team_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Minute</span>
          <span className="font-medium">
            {formatMinute(event.minute, event.second, event.period)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <span className="font-medium">{event.type}</span>
        </div>
        {event.outcome && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Outcome</span>
            <span className="font-medium">{event.outcome}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Location</span>
          <span className="text-right font-medium">
            {describeLocation(event.location_x, event.location_y)}
          </span>
        </div>
      </div>

      <Separator className="my-3" />

      {/* Watch video */}
      <Button
        onClick={handleWatchVideo}
        disabled={videoLoading || !event.timestamp}
        variant="default"
        size="sm"
        className="w-full"
      >
        {videoLoading ? "Loading video..." : "Watch Video"}
      </Button>

      {videoError && (
        <p className="mt-2 text-xs text-destructive">{videoError}</p>
      )}

      {videoUrl && (
        <div className="mt-3">
          {muxPlaybackId ? (
            <MuxPlayer
              playbackId={muxPlaybackId}
              streamType="on-demand"
              autoPlay
              className="w-full rounded-lg"
              style={{ maxHeight: "300px" }}
            />
          ) : (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full rounded-lg"
              style={{ maxHeight: "300px" }}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      )}
    </div>
  );
}
