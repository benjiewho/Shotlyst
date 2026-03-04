# Maintenance Log

## 2026-03-04 — Safe Codebase Cleanup

### Batch A — Dead Convex functions

| Change | Files | Why | Risk | Verification |
|--------|-------|-----|------|-------------|
| Deleted `suggestVideoGoal` action | `convex/ai.ts` | Zero references outside definition | Low | build + lint |
| Deleted `projects.list` query | `convex/projects.ts` | Zero references; `listWithProgress` replaces it | Low | build + lint |
| Deprecated `templateId` in `projects.create` | `convex/projects.ts` | No callers pass it; kept optional for safety | Low | build + lint |
| Added NOTE on `reflections.getByProject` | `convex/reflections.ts` | Unused now; likely needed for future feature | None | N/A |

### Batch B — Orphaned files + config

| Change | Files | Why | Risk | Verification |
|--------|-------|-----|------|-------------|
| Deleted `lib/shotlists/` directory | `lib/shotlists/types.ts`, `lib/shotlists/templates/index.ts`, `lib/shotlists/index.ts` | Zero imports anywhere; orphaned after template flow removed | Low | build + lint |
| Removed `pages/**` from Tailwind content | `tailwind.config.ts` | No `pages/` directory exists (App Router only) | Low | build + lint |
| Added PWA icon placeholders | `public/icon-192.png`, `public/icon-512.png` | Referenced by `manifest.json` but were missing (404) | Low | manual check |

### Batch C — Consolidation + docs

| Change | Files | Why | Risk | Verification |
|--------|-------|-----|------|-------------|
| Extracted `hasConvex` to shared module | `lib/convex/has-convex.ts` (new), `app/(app)/dashboard/page.tsx`, `app/(app)/profile/page.tsx`, `components/auth/convex-auth-guard.tsx` | Same 3-line check duplicated in 3 files | Low | build + lint |
| Updated governance docs | `governance/ARCHITECTURE_DECISIONS.md`, `governance/BUILD_STATUS.md` | Reflect AI-only flow, removed templates, cleanup results | None | N/A |
| Updated cleanup deliverables | `docs/CLEANUP_PLAN.md`, `docs/CLEANUP_CANDIDATES.md`, `docs/MAINTENANCE_LOG.md` | Final state of cleanup documentation | None | N/A |

### Verification Results

**Build:** PASS — all 9 pages generated, 0 errors, 1 pre-existing warning (`react-hooks/exhaustive-deps` in capture/page.tsx)
**Lint:** PASS — same 1 pre-existing warning only

### Leftover Items (NOTES for future cleanup)

| Item | Location | Note | Recommended next step |
|------|----------|------|----------------------|
| `templateId` field (deprecated) | `convex/schema.ts`, `convex/projects.ts` | Optional, unused by frontend. Kept for safety. | Remove after confirming no production data relies on it |
| `reflections.getByProject` | `convex/reflections.ts` | Defined but not called from frontend | Keep — likely needed for future "view reflection" feature |
| `react-hooks/exhaustive-deps` warning | `app/(app)/project/[id]/capture/page.tsx:162` | Pre-existing; `recordedBlobUrl` intentionally excluded | Consider adding eslint-disable comment with reason |
