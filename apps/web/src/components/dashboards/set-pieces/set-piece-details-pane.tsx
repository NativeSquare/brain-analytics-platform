"use client";

import { useEffect, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import LegendOutcome from "./legend-outcome";
import LegendXgSize from "./legend-xg-size";
import SetPieceDetailsList from "./set-piece-details-list";
import type { SetPiece, SetPieceMode } from "./types";
import { parseTimestamp } from "./utils";

interface SetPieceDetailsPaneProps {
  activeItem: SetPiece | null;
  mode: SetPieceMode;
  matchId: number | null;
}

type WyscoutOffsets = Record<string, { start: number; end: number }>;

const SetPieceDetailsPane = ({
  activeItem,
  mode,
  matchId,
}: SetPieceDetailsPaneProps) => {
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoDisplayMode, setVideoDisplayMode] = useState<
    "overlay" | "inline"
  >("overlay");
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);

  // Clear video on selection change
  useEffect(() => {
    setVideoUrl(null);
    setVideoError(null);
    setVideoDisplayMode("overlay");
    setMuxPlaybackId(null);
  }, [activeItem?.start_event_id]);

  const applyPeriodOffset = (
    timestampSeconds: number,
    period: number | null,
    offsets: WyscoutOffsets,
  ): number => {
    if (Number(period) === 2 && Number(offsets["2H"]?.start)) {
      return timestampSeconds + offsets["2H"].start;
    }
    if (Number(period) === 3 && Number(offsets["E1"]?.start)) {
      return timestampSeconds + offsets["E1"].start;
    }
    if (Number(period) === 4 && Number(offsets["E2"]?.start)) {
      return timestampSeconds + offsets["E2"].start;
    }
    return timestampSeconds;
  };

  const handleVideo = async () => {
    if (!activeItem) return;
    setVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null);
    setMuxPlaybackId(null);
    setVideoDisplayMode("overlay");

    try {
      const spMatchId = activeItem.match_id ?? matchId;
      if (!spMatchId || !activeItem.start_time) {
        throw new Error("Match ID or timestamp is missing");
      }

      // Get wyscout match ID
      const wyscoutResp = await fetch(
        `/api/wyscout/match-id?statsbomb_match_id=${spMatchId}`,
      );
      if (!wyscoutResp.ok) throw new Error("Failed to fetch Wyscout match ID");
      const wyscoutData = (await wyscoutResp.json()) as {
        wyscoutMatchId: string | null;
      };
      if (!wyscoutData.wyscoutMatchId)
        throw new Error("Wyscout match ID not found");

      // Get offsets
      const offsetsResp = await fetch(
        `/api/wyscout/offsets?wyscout_match_id=${wyscoutData.wyscoutMatchId}`,
      );
      if (!offsetsResp.ok) throw new Error("Failed to fetch offsets");
      const offsetsData = (await offsetsResp.json()) as {
        offsets: { offsets: WyscoutOffsets };
      };
      const offsets = offsetsData.offsets?.offsets ?? {};

      // Calculate timestamps
      const startTs = parseTimestamp(activeItem.start_time);
      const endTs = parseTimestamp(activeItem.end_time);

      if (startTs == null) throw new Error("Invalid timestamp");

      const adjustedStart = applyPeriodOffset(
        startTs,
        activeItem.period,
        offsets,
      );
      const adjustedEnd = endTs
        ? applyPeriodOffset(endTs, activeItem.period, offsets)
        : adjustedStart + 6;

      const startTimestamp = Math.floor(adjustedStart - 3);
      const endTimestamp = Math.ceil(adjustedEnd + 5);

      // Get video URL
      const videoResp = await fetch(
        `/api/wyscout/urls?wyscout_match_id=${wyscoutData.wyscoutMatchId}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`,
      );
      if (!videoResp.ok) {
        const errorData = (await videoResp.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to fetch video URL");
      }

      const videoData = (await videoResp.json()) as {
        url: string | null;
        muxPlaybackId?: string;
      };
      setVideoUrl(videoData.url);
      setMuxPlaybackId(videoData.muxPlaybackId ?? null);
    } catch (error) {
      setVideoError(
        error instanceof Error ? error.message : "Failed to fetch video URL",
      );
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="text-sm font-semibold uppercase">Details</div>
        {!activeItem ? (
          <div className="text-sm text-muted-foreground">
            Select a set piece to view details
          </div>
        ) : (
          <SetPieceDetailsList item={activeItem} mode={mode} />
        )}

        {activeItem && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleVideo}
                disabled={
                  videoLoading ||
                  !(activeItem.match_id ?? matchId) ||
                  !activeItem.start_time
                }
                variant="default"
                size="sm"
              >
                {videoLoading ? "Loading..." : "Watch Video"}
              </Button>
              {videoError && (
                <div className="mt-1 text-xs text-destructive">
                  {videoError}
                </div>
              )}
              {videoUrl && videoDisplayMode === "inline" && (
                <div className="mt-2 space-y-2">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVideoDisplayMode("overlay")}
                    >
                      Open overlay
                    </Button>
                  </div>
                  {muxPlaybackId ? (
                    <MuxPlayer
                      playbackId={muxPlaybackId}
                      streamType="on-demand"
                      className="w-full rounded-lg"
                      style={{ maxHeight: "400px" }}
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full rounded-lg"
                      style={{ maxHeight: "400px" }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <Separator />
        <div className="space-y-3">
          <div className="text-sm font-semibold uppercase">Legend</div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <LegendOutcome mode={mode} />
            {mode === "direct" && <LegendXgSize />}
          </div>
        </div>
      </div>

      {/* Video overlay */}
      {videoUrl && videoDisplayMode === "overlay" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl rounded-xl border bg-background p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setVideoDisplayMode("inline")}
              >
                Close
              </Button>
            </div>
            {muxPlaybackId ? (
              <MuxPlayer
                playbackId={muxPlaybackId}
                streamType="on-demand"
                autoPlay
                className="w-full rounded-lg"
                style={{ maxHeight: "80vh" }}
              />
            ) : (
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full rounded-lg"
                style={{ maxHeight: "80vh" }}
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SetPieceDetailsPane;
