# Story: Consolidate Environment Variables for Email URLs

Status: backlog
Sprint: 2
Epic: Technical Debt
Story Type: backend

## Story

As a developer,
I want to consolidate the environment variables used for building email invitation URLs,
so that we have a single source of truth instead of multiple fallback chains.

## Background

Currently, email templates in 3 files build the invite URL using a fallback chain:
```
process.env.WEB_APP_URL || process.env.ADMIN_URL || "http://localhost:3000"
```

Meanwhile, the auth config uses `SITE_URL` for CORS. This creates confusion about which env var to set.

## Acceptance Criteria

1. All email URL construction uses `SITE_URL` as the primary variable (already set in Convex env)
2. `WEB_APP_URL` and `ADMIN_URL` are removed as fallbacks
3. Fallback for dev remains `http://localhost:3000`

## Files to modify

1. `packages/backend/convex/emails.ts` — lines 59, 96: replace `WEB_APP_URL || ADMIN_URL` with `SITE_URL`
2. `packages/backend/convex/invitations/actions.ts` — line 36: same replacement

## Temporary workaround

Until this story is implemented, add `WEB_APP_URL` env var in Convex Dashboard pointing to the production URL:
```
npx convex env set WEB_APP_URL https://<prod-domain>
```
