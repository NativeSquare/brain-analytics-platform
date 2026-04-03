"use client";

import { useEffect, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { Button } from "@/components/ui/button";
import type { Possession } from "./types";

type WyscoutOffsets = Record<string, { start: number; end: number }>;

interface PossessionVideoPlayerProps {
  possession: Possession | null;
  matchId: number | null;
}

function parseTimestamp(ts: string): number {
  // "HH:MM:SS.sss" -> seconds
  const parts = ts.split(":");
  if (parts.length < 3) return 0;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

function applyPeriodOffset(
  timestampSeconds: number,
  period: number,
  offsets: WyscoutOffsets,
): number {
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
}

export default function PossessionVideoPlayer({
  possession,
  matchId,
}: PossessionVideoPlayerProps) {
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Reset video when selection changes
  useEffect(() => {
    setVideoUrl(null);
    setMuxPlaybackId(null);
    setVideoError(null);
  }, [possession?.start_time, possession?.match_id]);

  const handleWatchVideo = async () => {
    if (!possession || !matchId) return;

    setVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null);
    setMuxPlaybackId(null);

    try {
      // 1. Resolve Wyscout match ID
      const matchIdRes = await fetch(
        `/api/wyscout/match-id?statsbomb_match_id=${matchId}`,
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
      const startTs = parseTimestamp(possession.start_time);
      const endTs = parseTimestamp(possession.end_time);
      const adjustedStart = applyPeriodOffset(
        startTs,
        possession.period,
        offsets,
      );
      const adjustedEnd = applyPeriodOffset(endTs, possession.period, offsets);
      const startTimestamp = Math.max(0, Math.floor(adjustedStart - 2));
      const endTimestamp = Math.ceil(adjustedEnd + 2);

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
    } catch (err) {
      setVideoError(
        err instanceof Error ? err.message : "Failed to fetch video",
      );
    } finally {
      setVideoLoading(false);
    }
  };

  if (!possession) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Select a possession from the table to view details and video.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Team</span>
          <span className="font-medium">{possession.possession_team}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Phase</span>
          <span className="font-medium">{possession.phase}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Period</span>
          <span className="font-medium">{possession.period}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-medium">
            {possession.duration_seconds.toFixed(1)}s
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shots / Goals</span>
          <span className="font-medium">
            {possession.shot_count} / {possession.goal}
          </span>
        </div>
        {possession.total_xg > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">xG</span>
            <span className="font-medium">
              {possession.total_xg.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <Button
        onClick={handleWatchVideo}
        disabled={videoLoading}
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
