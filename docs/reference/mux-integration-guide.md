# MUX Video Integration Guide

Technical reference for integrating MUX Video into the Brain Analytics Platform (Next.js + Convex).

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [SDK Installation](#2-sdk-installation)
3. [Server-Side SDK Initialization](#3-server-side-sdk-initialization)
4. [Creating Assets from a URL (Wyscout Caching Flow)](#4-creating-assets-from-a-url-wyscout-caching-flow)
5. [Direct Upload from Browser (Coach Upload Flow)](#5-direct-upload-from-browser-coach-upload-flow)
6. [Video Playback](#6-video-playback)
7. [Asset Management](#7-asset-management)
8. [Webhooks](#8-webhooks)
9. [Architecture: Two Integration Flows](#9-architecture-two-integration-flows)

---

## 1. Environment Setup

### Required Environment Variables

```env
MUX_TOKEN_ID=your_token_id
MUX_TOKEN_SECRET=your_token_secret
MUX_WEBHOOK_SECRET=your_webhook_signing_secret
```

Generate credentials at: **Mux Dashboard > Settings > Access Tokens**.

The token needs **Mux Video** read/write permissions. The webhook secret is found under **Settings > Webhooks** after creating a webhook endpoint.

---

## 2. SDK Installation

```bash
# Server-side SDK (Node.js — used in Convex actions or Next.js API routes)
npm install @mux/mux-node

# React player component (client-side)
npm install @mux/mux-player-react

# Chunked upload library (client-side, for direct uploads)
npm install @mux/upchunk
```

| Package | Purpose | Runs on |
|---------|---------|---------|
| `@mux/mux-node` | Asset creation, direct upload URLs, asset management, webhook verification | Server only |
| `@mux/mux-player-react` | Video player React component | Client only |
| `@mux/upchunk` | Chunked file upload to MUX direct upload URLs | Client only |

---

## 3. Server-Side SDK Initialization

```typescript
import Mux from "@mux/mux-node";

// Option A: Explicit credentials
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// Option B: Auto-reads MUX_TOKEN_ID and MUX_TOKEN_SECRET from env
const mux = new Mux();
```

All video operations live under `mux.video`.

---

## 4. Creating Assets from a URL (Wyscout Caching Flow)

This is the primary flow for caching Wyscout clips. You give MUX a URL and MUX downloads and processes the video.

### Create an Asset from a Remote URL

```typescript
const asset = await mux.video.assets.create({
  inputs: [{ url: "https://api.wyscout.com/v3/videos/clip-xyz.mp4?token=abc" }],
  playback_policies: ["public"],
  video_quality: "basic", // "basic" | "plus" | "premium"
  passthrough: "shot_id:12345", // your internal ID for correlation (max 255 chars)
});

// asset.id — unique asset ID (store this in your database)
// asset.status — "preparing" initially
// asset.playback_ids[0].id — playback ID (available immediately but video not ready yet)
```

### Asset Status Lifecycle

```
preparing  →  ready
           →  errored
```

- **preparing**: MUX is downloading and transcoding the video.
- **ready**: Video is playable. The `video.asset.ready` webhook fires.
- **errored**: Ingestion failed (bad URL, unsupported format, etc.).

### Check Asset Status (Polling — prefer webhooks)

```typescript
const asset = await mux.video.assets.retrieve("ASSET_ID");
console.log(asset.status); // "preparing" | "ready" | "errored"
```

### Create Asset Parameters Reference

| Parameter | Type | Description |
|-----------|------|-------------|
| `inputs` | `Array<{ url: string }>` | Source URL(s). MUX fetches the file. |
| `playback_policies` | `string[]` | `"public"`, `"signed"`, or `"drm"` |
| `video_quality` | `string` | `"basic"` (cheapest), `"plus"`, `"premium"` |
| `passthrough` | `string` | Custom metadata for correlation (max 255 chars) |
| `max_resolution_tier` | `string` | `"1080p"`, `"1440p"`, `"2160p"` |
| `normalize_audio` | `boolean` | Normalize audio loudness |
| `test` | `boolean` | Test asset: watermarked, 10s limit, auto-deleted in 24h |

---

## 5. Direct Upload from Browser (Coach Upload Flow)

Direct uploads let the browser upload files straight to MUX without proxying through your server. The flow is:

1. **Server** creates a signed upload URL via MUX API
2. **Server** returns the URL to the client
3. **Client** uploads the file directly to MUX using that URL

### Step 1: Server — Create a Direct Upload URL

```typescript
// In a Next.js API route or Convex action
const upload = await mux.video.uploads.create({
  cors_origin: "https://your-app.com", // REQUIRED for browser uploads
  new_asset_settings: {
    playback_policies: ["public"],
    video_quality: "basic",
    passthrough: "training_session:789",
  },
  timeout: 3600, // seconds until URL expires (default: 3600, max: 604800)
});

// Return these to the client:
// upload.url — the signed upload URL (client uploads to this)
// upload.id — upload ID for tracking
```

### Step 2: Client — Upload with UpChunk

```typescript
import * as UpChunk from "@mux/upchunk";

function uploadVideo(file: File, uploadUrl: string) {
  const upload = UpChunk.createUpload({
    endpoint: uploadUrl,
    file: file,
    chunkSize: 30720, // kB, must be multiple of 256 (default: 30720 = 30MB)
  });

  upload.on("progress", (event) => {
    const percent = event.detail; // 0-100
    console.log(`Upload progress: ${percent}%`);
  });

  upload.on("success", () => {
    console.log("Upload complete — MUX is now processing the video");
  });

  upload.on("error", (event) => {
    console.error("Upload failed:", event.detail.message);
  });

  return upload; // caller can use upload.pause(), upload.resume(), upload.abort()
}
```

### UpChunk Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string \| () => Promise<string>` | required | Upload URL or async function returning one |
| `file` | `File` | required | The file to upload |
| `chunkSize` | `number` | 30720 | Chunk size in kB (must be multiple of 256) |
| `maxFileSize` | `number` | — | Max file size in kB |
| `attempts` | `number` | 5 | Retry attempts per chunk |
| `delayBeforeAttempt` | `number` | 1.0 | Seconds between retries |
| `dynamicChunkSize` | `boolean` | false | Adapt chunk size to network speed |

### UpChunk Events

| Event | `event.detail` | Description |
|-------|----------------|-------------|
| `progress` | `number` (0-100) | Upload percentage |
| `success` | `null` | Upload complete |
| `error` | `{ message, chunkNumber, attempts }` | Max retries exceeded |
| `attempt` | `{ chunkNumber, chunkSize }` | Before a chunk upload starts |
| `attemptFailure` | `{ message, chunkNumber, attemptsLeft }` | A chunk attempt failed |
| `chunkSuccess` | `{ chunk, attempts, response }` | Individual chunk succeeded |
| `offline` | `null` | Connection lost |
| `online` | `null` | Connection restored |

### UpChunk Methods

- `upload.pause()` — Pause after current chunk completes
- `upload.resume()` — Resume a paused upload
- `upload.abort()` — Cancel immediately

### Direct Upload Response Structure

```json
{
  "data": {
    "url": "https://storage.googleapis.com/...",
    "timeout": 3600,
    "status": "waiting",
    "id": "upload_abc123",
    "cors_origin": "https://your-app.com",
    "new_asset_settings": { ... }
  }
}
```

---

## 6. Video Playback

### Playback URL Format

Every asset has one or more **playback IDs**. The HLS streaming URL is:

```
https://stream.mux.com/{PLAYBACK_ID}.m3u8
```

With redundant streams (multiple CDN fallback):

```
https://stream.mux.com/{PLAYBACK_ID}.m3u8?redundant_streams=true
```

### React Player Component

```tsx
"use client";

import MuxPlayer from "@mux/mux-player-react";

interface VideoPlayerProps {
  playbackId: string;
  title?: string;
}

export function VideoPlayer({ playbackId, title }: VideoPlayerProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      streamType="on-demand"
      metadata={{
        video_title: title,
        // viewer_user_id: currentUser.id, // for Mux Data analytics
      }}
    />
  );
}
```

### Key MuxPlayer Props

| Prop | Type | Description |
|------|------|-------------|
| `playbackId` | `string` | The MUX playback ID |
| `streamType` | `string` | `"on-demand"` for VOD, `"live"` for live |
| `metadata` | `object` | `video_title`, `video_id`, `viewer_user_id` for analytics |
| `autoPlay` | `boolean` | Auto-play on load |
| `muted` | `boolean` | Start muted |
| `startTime` | `number` | Start position in seconds |
| `style` | `CSSProperties` | Inline styles |

### Playback Policies

- **`public`** — Anyone with the playback ID can watch. No expiry. Good for getting started.
- **`signed`** — Requires a JSON Web Token. Use for access-controlled content. Tokens are generated server-side with a signing key.

For our use case (cached Wyscout clips for internal use), `public` is fine initially. Switch to `signed` if clips need access control.

### Getting the Playback ID from an Asset

```typescript
const asset = await mux.video.assets.retrieve("ASSET_ID");
const playbackId = asset.playback_ids?.[0]?.id;
```

---

## 7. Asset Management

### Retrieve an Asset

```typescript
const asset = await mux.video.assets.retrieve("ASSET_ID");
// asset.status, asset.duration, asset.playback_ids, etc.
```

### Delete an Asset

```typescript
await mux.video.assets.delete("ASSET_ID");
// Permanent. Asset cannot be recovered.
```

### List Assets

```typescript
const { data: assets } = await mux.video.assets.list();
```

---

## 8. Webhooks

Webhooks are the recommended way to know when assets are ready (vs polling).

### Key Webhook Events

| Event | When it fires |
|-------|--------------|
| `video.asset.created` | Asset initialized |
| `video.asset.ready` | **Asset is playable** — store the playback ID now |
| `video.asset.errored` | Processing failed |
| `video.asset.deleted` | Asset was deleted |
| `video.upload.asset_created` | Direct upload completed, asset created |
| `video.upload.errored` | Direct upload failed |
| `video.upload.cancelled` | Direct upload cancelled |

### Webhook Payload Structure

```json
{
  "type": "video.asset.ready",
  "object": {
    "type": "asset",
    "id": "asset_abc123"
  },
  "id": "webhook_event_id",
  "environment": { "name": "Production", "id": "env_xyz" },
  "data": {
    "id": "asset_abc123",
    "status": "ready",
    "playback_ids": [{ "id": "PLAYBACK_ID", "policy": "public" }],
    "duration": 153.36,
    "passthrough": "shot_id:12345",
    "created_at": "2025-01-15T01:04:45.000Z"
  },
  "created_at": "2025-01-15T01:04:50.000Z"
}
```

### Webhook Handler (Next.js App Router)

```typescript
// app/api/webhooks/mux/route.ts
import Mux from "@mux/mux-node";
import { headers } from "next/headers";

const mux = new Mux({
  webhookSecret: process.env.MUX_WEBHOOK_SECRET,
});

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();

  // Verify signature and parse event
  let event: Mux.Webhooks.UnwrappedEvent;
  try {
    event = mux.webhooks.unwrap(body, headersList);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 401 });
  }

  switch (event.type) {
    case "video.asset.ready": {
      const assetId = event.data.id;
      const playbackId = event.data.playback_ids?.[0]?.id;
      const passthrough = event.data.passthrough; // your shot_id or session_id

      // TODO: Update your database — mark the clip as ready with the playback ID
      console.log(`Asset ${assetId} ready. Playback ID: ${playbackId}`);
      break;
    }

    case "video.asset.errored": {
      const assetId = event.data.id;
      const passthrough = event.data.passthrough;
      console.error(`Asset ${assetId} failed to process`);
      // TODO: Mark the clip as failed in your database
      break;
    }

    case "video.upload.asset_created": {
      // Direct upload completed — an asset was created
      const assetId = event.data.asset_id;
      console.log(`Upload created asset: ${assetId}`);
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
```

### Webhook Setup

1. **Dashboard**: Mux Dashboard > Settings > Webhooks > Create Webhook
2. **URL**: `https://your-app.com/api/webhooks/mux`
3. **Environment**: Must match the access token environment

### Local Development

Use the Mux CLI to forward webhooks to localhost:

```bash
# Install Mux CLI, then:
mux webhooks listen --forward-to http://localhost:3000/api/webhooks/mux

# Trigger a test event:
mux webhooks trigger video.asset.ready --forward-to http://localhost:3000/api/webhooks/mux
```

Alternative: use ngrok to expose your local server.

### Retry Policy

If MUX doesn't receive a 2xx response, it retries for 24 hours with escalating delays. Requests time out after 5 seconds.

---

## 9. Architecture: Two Integration Flows

### Flow A: Wyscout Clip Caching

**Goal**: Avoid consuming Wyscout credits on repeated viewings. First viewing downloads from Wyscout; subsequent viewings stream from MUX.

```
┌──────────┐     1. "Watch clip"      ┌──────────────┐
│ Frontend │ ────────────────────────► │ Backend      │
│          │                           │ (Convex)     │
│          │     5. Return playbackId  │              │
│          │ ◄──────────────────────── │              │
│          │                           │              │
│ MuxPlayer│     6. Stream video       │              │
│          │ ◄──────────────────────── │              │ 
└──────────┘        from MUX           └──────┬───────┘
                                              │
                                    2. Check DB: MUX    3. Create asset
                                       asset exists?     from Wyscout URL
                                              │               │
                                              │         ┌─────▼─────┐
                                              │         │  MUX API  │
                                              │         │           │
                                              │         │ 4. MUX    │
                                              │         │ downloads │
                                              │         │ & encodes │
                                              └─────────┴───────────┘
```

**Implementation sketch (Convex action)**:

```typescript
// convex/mux.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export const getOrCreateClip = action({
  args: { shotId: v.id("shots") },
  handler: async (ctx, { shotId }) => {
    // 1. Check if we already have a MUX asset for this shot
    const existing = await ctx.runQuery(internal.clips.getClipByShotId, { shotId });

    if (existing?.muxPlaybackId && existing.muxStatus === "ready") {
      return { playbackId: existing.muxPlaybackId, status: "ready" };
    }

    if (existing?.muxAssetId && existing.muxStatus === "preparing") {
      return { playbackId: existing.muxPlaybackId, status: "preparing" };
    }

    // 2. Get the Wyscout video URL (this consumes 1 Wyscout credit)
    const wyscoutUrl = await getWyscoutVideoUrl(shotId);

    // 3. Tell MUX to ingest from the Wyscout URL
    const asset = await mux.video.assets.create({
      inputs: [{ url: wyscoutUrl }],
      playback_policies: ["public"],
      video_quality: "basic",
      passthrough: shotId, // correlate back to our shot
    });

    // 4. Store the MUX asset ID and playback ID in our database
    await ctx.runMutation(internal.clips.saveClip, {
      shotId,
      muxAssetId: asset.id,
      muxPlaybackId: asset.playback_ids?.[0]?.id ?? null,
      muxStatus: "preparing",
    });

    return {
      playbackId: asset.playback_ids?.[0]?.id,
      status: "preparing",
    };
  },
});
```

**Key points**:
- The Wyscout URL must be accessible to MUX's servers (no auth headers needed — Wyscout URLs are typically signed/tokenized).
- MUX downloads the file itself; no bandwidth goes through our server.
- The `passthrough` field lets us correlate the webhook back to our `shotId`.
- First request returns `status: "preparing"`. Frontend can poll or wait for the webhook.
- On `video.asset.ready` webhook, update the database status to `"ready"`.

### Flow B: Direct Upload (Coach Training Videos)

**Goal**: Let coaches upload training session videos without consuming server bandwidth.

```
┌──────────┐   1. Request upload URL   ┌──────────────┐
│ Frontend │ ──────────────────────────►│ Backend      │
│          │                            │ (API route)  │
│          │   2. Return upload URL     │              │
│          │ ◄──────────────────────────│              │
│          │                            └──────────────┘
│          │                                    
│          │   3. Upload file directly  ┌──────────────┐
│ UpChunk  │ ──────────────────────────►│  MUX         │
│          │   (chunked, resumable)     │              │
│          │                            │ 4. Process   │
└──────────┘                            │              │
                                        │ 5. Webhook   │
                                        │    ──────────►│ Backend updates DB
                                        └──────────────┘
```

**Server — Create upload URL (Next.js API route)**:

```typescript
// app/api/mux/upload/route.ts
import Mux from "@mux/mux-node";
import { NextResponse } from "next/server";

const mux = new Mux();

export async function POST(request: Request) {
  const { sessionId } = await request.json();

  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL!, // e.g. "https://app.example.com"
    new_asset_settings: {
      playback_policies: ["public"],
      video_quality: "basic",
      passthrough: `session:${sessionId}`,
    },
    timeout: 3600,
  });

  return NextResponse.json({
    uploadUrl: upload.url,
    uploadId: upload.id,
  });
}
```

**Client — Upload with UpChunk**:

```tsx
"use client";

import { useState } from "react";
import * as UpChunk from "@mux/upchunk";

export function VideoUploader({ sessionId }: { sessionId: string }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Get upload URL from our API
    const res = await fetch("/api/mux/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const { uploadUrl } = await res.json();

    // 2. Upload directly to MUX
    setStatus("uploading");
    const upload = UpChunk.createUpload({
      endpoint: uploadUrl,
      file,
      chunkSize: 30720, // 30 MB chunks
    });

    upload.on("progress", (e) => setProgress(Math.round(e.detail)));
    upload.on("success", () => setStatus("done"));
    upload.on("error", (e) => {
      console.error(e.detail.message);
      setStatus("error");
    });
  };

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleFileChange} disabled={status === "uploading"} />
      {status === "uploading" && <p>Uploading: {progress}%</p>}
      {status === "done" && <p>Upload complete. Processing video...</p>}
      {status === "error" && <p>Upload failed. Please try again.</p>}
    </div>
  );
}
```

---

## Quick Reference: Common SDK Calls

```typescript
import Mux from "@mux/mux-node";
const mux = new Mux();

// Create asset from URL
const asset = await mux.video.assets.create({
  inputs: [{ url: "https://..." }],
  playback_policies: ["public"],
  video_quality: "basic",
});

// Create direct upload URL
const upload = await mux.video.uploads.create({
  cors_origin: "https://your-app.com",
  new_asset_settings: { playback_policies: ["public"] },
});

// Retrieve asset
const asset = await mux.video.assets.retrieve("ASSET_ID");

// Delete asset
await mux.video.assets.delete("ASSET_ID");

// Verify webhook
const event = mux.webhooks.unwrap(body, headers);
```

## Playback URL Cheat Sheet

| Format | URL |
|--------|-----|
| HLS stream | `https://stream.mux.com/{PLAYBACK_ID}.m3u8` |
| Thumbnail | `https://image.mux.com/{PLAYBACK_ID}/thumbnail.jpg` |
| Animated GIF | `https://image.mux.com/{PLAYBACK_ID}/animated.gif` |
| Storyboard | `https://image.mux.com/{PLAYBACK_ID}/storyboard.vtt` |

---

## Sources

- [MUX Direct Uploads Guide](https://www.mux.com/docs/guides/upload-files-directly)
- [MUX Create Asset API Reference](https://www.mux.com/docs/api-reference/video/assets/create-asset)
- [MUX Create Direct Upload API Reference](https://www.mux.com/docs/api-reference/video/direct-uploads/create-direct-upload)
- [MUX Play Your Videos Guide](https://www.mux.com/docs/guides/play-your-videos)
- [MUX Webhooks Guide](https://www.mux.com/docs/core/listen-for-webhooks)
- [MUX Node SDK (GitHub)](https://github.com/muxinc/mux-node-sdk)
- [UpChunk (GitHub)](https://github.com/muxinc/upchunk)
- [@mux/mux-player-react](https://www.npmjs.com/package/@mux/mux-player-react)
- [MUX Next.js Integration](https://www.mux.com/docs/frameworks/next-js)
