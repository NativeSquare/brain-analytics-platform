import Mux from "@mux/mux-node";

function getMuxClient(): Mux | null {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) return null;
  return new Mux({ tokenId, tokenSecret });
}

export async function uploadToMux(
  videoUrl: string,
  passthrough?: string,
): Promise<{ assetId: string; playbackId: string } | null> {
  const mux = getMuxClient();
  if (!mux) return null;

  const asset = await mux.video.assets.create({
    inputs: [{ url: videoUrl }],
    playback_policies: ["public"],
    video_quality: "basic",
    ...(passthrough ? { passthrough } : {}),
  });

  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) return null;

  return {
    assetId: asset.id,
    playbackId,
  };
}

export function isMuxConfigured(): boolean {
  return !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}
