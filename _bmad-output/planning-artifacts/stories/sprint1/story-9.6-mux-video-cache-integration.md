# Story 9.6: MUX Video Cache Integration

Status: draft
Story Type: fullstack
Points: 8

> **PROJECT SCOPE:** All frontend work targets `apps/web/`. Do NOT modify `apps/admin/`.

## Story

As a club analyst,
I want video clips from Wyscout to be cached on MUX infrastructure,
So that repeated viewings don't consume Wyscout API credits and videos stream reliably from our own CDN.

## Background

The client (BrainAnalytics) pays per-credit for Wyscout video API calls. Every time a clip is streamed directly from Wyscout, it costs credits. The solution is to cache downloaded clips on MUX (video hosting/streaming platform) so that:
1. First view: fetch from Wyscout → upload to MUX → stream from MUX
2. Subsequent views: stream directly from MUX (no Wyscout credit consumed)

Story 8.3 implemented the Wyscout/Hudl integration with a placeholder "Convex storage" cache. This story replaces that cache layer with MUX.

## Acceptance Criteria

### AC1: MUX SDK integrated

**Given** the MUX SDK is installed
**When** the backend processes a video request
**Then** it can upload videos to MUX via the MUX API
**And** it can retrieve MUX playback URLs for cached videos
**And** MUX credentials are stored in environment variables (MUX_TOKEN_ID, MUX_TOKEN_SECRET)

### AC2: Video cache flow — first view

**Given** a user clicks "Shot video" or "Possession video" on a shot detail pane
**When** no cached MUX asset exists for this clip (match_id + start_timestamp + end_timestamp)
**Then** the system:
1. Fetches the Wyscout video URL (existing Story 8.3 flow)
2. Downloads the video from Wyscout
3. Uploads it to MUX as a new asset
4. Stores the MUX asset ID and playback ID in Convex (wyscoutVideoCache table)
5. Returns the MUX playback URL to the frontend
**And** the video plays in the embedded player

### AC3: Video cache flow — subsequent views

**Given** a user clicks a video button for a clip that was previously cached
**When** a MUX asset exists in wyscoutVideoCache for this clip
**Then** the system returns the MUX playback URL directly (no Wyscout API call)
**And** the video plays immediately without re-downloading

### AC4: MUX playback in frontend

**Given** a MUX playback URL is returned
**When** the video player renders
**Then** it uses MUX's HLS streaming (via @mux/mux-player-react or native HLS)
**And** the player supports quality selection, seeking, and fullscreen
**And** the overlay/inline display modes from Story 9.4 still work

### AC5: Cache table updated

**Given** the existing wyscoutVideoCache Convex table (from Story 8.3)
**When** the schema is checked
**Then** it includes fields: muxAssetId, muxPlaybackId (in addition to existing fields)
**And** the cache lookup checks for muxPlaybackId presence before falling back to Wyscout

### AC6: Graceful degradation

**Given** MUX is not configured (no MUX_TOKEN_ID)
**When** a user clicks a video button
**Then** the system falls back to streaming directly from Wyscout URL (existing behavior)
**And** no error is shown to the user

## Implementation Notes

### Environment Variables
- MUX_TOKEN_ID — MUX API token ID
- MUX_TOKEN_SECRET — MUX API token secret

### MUX SDK
- Use `@mux/mux-node` for server-side upload/asset management
- Use `@mux/mux-player-react` for frontend playback (or native HLS.js)

### Cache table changes
Update `packages/backend/convex/table/wyscoutVideoCache.ts` to add:
- `muxAssetId: v.optional(v.string())`
- `muxPlaybackId: v.optional(v.string())`

### API route changes
Modify `apps/web/src/app/api/wyscout/urls/route.ts`:
1. Check Convex cache for existing MUX playback ID
2. If found → return MUX stream URL
3. If not → fetch from Wyscout → download → upload to MUX → save to cache → return MUX stream URL

### Frontend changes
- Update `apps/web/src/components/dashboards/shot-map/details-pane.tsx` to use MUX player when MUX URL is returned
- Same pattern applies to Event Map (Story 10.1), Set Pieces (Story 10.3), View Possessions (Story 10.6) detail panes

### Technical Reference
- **MUX integration guide**: `docs/reference/mux-integration-guide.md` — covers SDK setup, asset creation from URL, playback, webhooks, and both integration flows

### Dependencies
- Story 8.3 (Wyscout integration — done)
- Story 9.4 (Shot Map — done, video buttons exist)
- MUX account + API credentials from client
