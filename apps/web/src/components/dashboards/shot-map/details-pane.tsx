"use client";

import { useEffect, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import OutcomeLegend from "./outcome-legend";
import PhaseLegend from "./phase-legend";
import XgSizeLegend from "./xg-size-legend";
import ShotDetailsList from "./shot-details-list";
import type { Shot } from "./types";
import { parseTimestamp } from "./constants";

interface DetailsPaneProps {
  activeShot: Shot | null;
  allTeamShots: boolean;
  pitchScale: number;
  matchId?: number | null;
}

type WyscoutOffsets = Record<string, { start: number; end: number }>;

const DetailsPane = ({
  activeShot,
  allTeamShots,
  pitchScale,
  matchId,
}: DetailsPaneProps) => {
  const [shotVideoLoading, setShotVideoLoading] = useState(false);
  const [possessionVideoLoading, setPossessionVideoLoading] = useState(false);
  const [bestQualityVideoUrl, setBestQualityVideoUrl] = useState<string | null>(null);
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null);
  const [videoDisplayMode, setVideoDisplayMode] = useState<"overlay" | "inline">("overlay");
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);

  // Clear video when another shot is selected
  useEffect(() => {
    setBestQualityVideoUrl(null);
    setVideoUrlError(null);
    setVideoDisplayMode("overlay");
    setMuxPlaybackId(null);
  }, [activeShot?.event_id]);

  const getWyscoutMatchAndOffsets = async () => {
    if (!activeShot) {
      setVideoUrlError("Match ID or timestamp is missing");
      throw new Error("Match ID or timestamp is missing");
    }

    const shotMatchId = activeShot.match_id ?? matchId;
    if (!shotMatchId || !activeShot.timestamp) {
      setVideoUrlError("Match ID or timestamp is missing");
      throw new Error("Match ID or timestamp is missing");
    }

    const wyscoutMatchIdResponse = await fetch(
      `/api/wyscout/match-id?statsbomb_match_id=${shotMatchId}`,
    );
    if (!wyscoutMatchIdResponse.ok) {
      throw new Error("Failed to fetch WYSCOUT match ID");
    }

    const wyscoutMatchIdData = (await wyscoutMatchIdResponse.json()) as {
      wyscoutMatchId: string | null;
    };
    if (!wyscoutMatchIdData.wyscoutMatchId) {
      throw new Error("WYSCOUT match ID not found");
    }

    const offsetsResponse = await fetch(
      `/api/wyscout/offsets?wyscout_match_id=${wyscoutMatchIdData.wyscoutMatchId}`,
    );
    if (!offsetsResponse.ok) {
      throw new Error("Failed to fetch offsets");
    }

    const offsetsData = (await offsetsResponse.json()) as {
      offsets: { offsets: WyscoutOffsets };
    };

    const offsets = offsetsData.offsets?.offsets ?? {};
    return { wyscoutMatchId: wyscoutMatchIdData.wyscoutMatchId, offsets };
  };

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

  const handlePossessionVideo = async () => {
    setPossessionVideoLoading(true);
    setVideoUrlError(null);
    setBestQualityVideoUrl(null);
    setMuxPlaybackId(null);
    setVideoDisplayMode("overlay");

    try {
      const { wyscoutMatchId, offsets } = await getWyscoutMatchAndOffsets();

      let startTimestamp: number;
      let endTimestamp: number;

      if (activeShot && activeShot.start_time && activeShot.end_time) {
        const startTimeSeconds = parseTimestamp(activeShot.start_time);
        const endTimeSeconds = parseTimestamp(activeShot.end_time);

        if (startTimeSeconds != null && endTimeSeconds != null) {
          const adjustedStart = applyPeriodOffset(startTimeSeconds, activeShot.period, offsets);
          const adjustedEnd = applyPeriodOffset(endTimeSeconds, activeShot.period, offsets);
          startTimestamp = Math.floor(adjustedStart - 3);
          endTimestamp = Math.ceil(adjustedEnd + 5);
        } else {
          const ts = parseTimestamp(activeShot?.timestamp ?? null);
          if (ts === null) throw new Error("Invalid timestamp format");
          const adjusted = applyPeriodOffset(ts, activeShot?.period ?? null, offsets);
          startTimestamp = Math.floor(adjusted - 3);
          endTimestamp = Math.ceil(adjusted + 5);
        }
      } else if (activeShot) {
        const ts = parseTimestamp(activeShot.timestamp);
        if (ts === null) throw new Error("Invalid timestamp format");
        const adjusted = applyPeriodOffset(ts, activeShot.period, offsets);
        startTimestamp = Math.floor(adjusted - 3);
        endTimestamp = Math.ceil(adjusted + 5);
      } else {
        throw new Error("No valid timestamp for video window");
      }

      const videoUrlResponse = await fetch(
        `/api/wyscout/urls?wyscout_match_id=${wyscoutMatchId}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`,
      );
      if (!videoUrlResponse.ok) {
        const errorData = (await videoUrlResponse.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to fetch video URL");
      }

      const videoUrlData = (await videoUrlResponse.json()) as {
        url: string | null;
        muxPlaybackId?: string;
      };
      setBestQualityVideoUrl(videoUrlData.url);
      setMuxPlaybackId(videoUrlData.muxPlaybackId ?? null);
    } catch (error) {
      setVideoUrlError(error instanceof Error ? error.message : "Failed to fetch video URL");
    } finally {
      setPossessionVideoLoading(false);
    }
  };

  const handleShotVideo = async () => {
    setShotVideoLoading(true);
    setVideoUrlError(null);
    setBestQualityVideoUrl(null);
    setMuxPlaybackId(null);
    setVideoDisplayMode("overlay");

    try {
      const { wyscoutMatchId, offsets } = await getWyscoutMatchAndOffsets();

      const ts = parseTimestamp(activeShot?.timestamp ?? null);
      if (ts === null) throw new Error("Invalid timestamp format");

      const adjusted = applyPeriodOffset(ts, activeShot?.period ?? null, offsets);
      const startTimestamp = Math.floor(adjusted - 3);
      const endTimestamp = Math.ceil(adjusted + 3);

      const videoUrlResponse = await fetch(
        `/api/wyscout/urls?wyscout_match_id=${wyscoutMatchId}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`,
      );
      if (!videoUrlResponse.ok) {
        const errorData = (await videoUrlResponse.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to fetch video URL");
      }

      const videoUrlData = (await videoUrlResponse.json()) as {
        url: string | null;
        muxPlaybackId?: string;
      };
      setBestQualityVideoUrl(videoUrlData.url);
      setMuxPlaybackId(videoUrlData.muxPlaybackId ?? null);
    } catch (error) {
      setVideoUrlError(error instanceof Error ? error.message : "Failed to fetch video URL");
    } finally {
      setShotVideoLoading(false);
    }
  };

  const anyVideoLoading = shotVideoLoading || possessionVideoLoading;

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="text-sm font-semibold uppercase">Details</div>
        {!activeShot ? (
          <div className="text-sm text-muted-foreground">
            Select a shot to view details
          </div>
        ) : (
          <ShotDetailsList activeShot={activeShot} allTeamShots={allTeamShots} />
        )}

        {activeShot && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleShotVideo}
                  disabled={anyVideoLoading || !(activeShot.match_id ?? matchId) || !activeShot.timestamp}
                  variant="default"
                  size="sm"
                  className="min-w-[140px] flex-1"
                >
                  {shotVideoLoading ? "Loading..." : "Shot video"}
                </Button>
                <Button
                  onClick={handlePossessionVideo}
                  disabled={anyVideoLoading || !(activeShot.match_id ?? matchId) || !activeShot.timestamp}
                  variant="default"
                  size="sm"
                  className="min-w-[140px] flex-1"
                >
                  {possessionVideoLoading ? "Loading..." : "Possession video"}
                </Button>
              </div>
              {videoUrlError && (
                <div className="mt-2 text-xs text-destructive">{videoUrlError}</div>
              )}
              {bestQualityVideoUrl && (
                <div className="mt-2">
                  {videoDisplayMode === "overlay" ? (
                    <div className="text-xs text-muted-foreground">Video opened in overlay.</div>
                  ) : (
                    <div className="space-y-2">
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
                          src={bestQualityVideoUrl}
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
              )}
            </div>
          </>
        )}

        <Separator />
        <div className="space-y-3">
          <div className="text-sm font-semibold uppercase">Legend</div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <OutcomeLegend />
            <PhaseLegend />
            <XgSizeLegend pitchScale={pitchScale} />
          </div>
        </div>
      </div>

      {bestQualityVideoUrl && videoDisplayMode === "overlay" && (
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
                src={bestQualityVideoUrl}
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

export default DetailsPane;
