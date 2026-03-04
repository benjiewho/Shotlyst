# Cleanup Plan

## Goal
Remove verified dead code, reduce complexity, and improve maintainability WITHOUT breaking runtime behavior.

## Risk Map

| Area | Risk | Reason |
|------|------|--------|
| Delete `suggestVideoGoal` action | Low | Zero references outside its own definition |
| Delete `projects.list` query | Low | Zero references; `listWithProgress` replaces it |
| Deprecate `templateId` in `projects.create` | Low | Already optional; no callers pass it |
| NOTE on `reflections.getByProject` | None | Comment only, no code change |
| Delete `lib/shotlists/` | Low | Zero imports anywhere in app/components/convex |
| Remove `pages/**` from Tailwind | Low | No `pages/` directory exists |
| Add PWA icons | Low | Files referenced by manifest but missing |
| Extract `hasConvex` | Low | Consolidation; same logic in 3 files |
| Update governance docs | None | Documentation only |

## Phases

### Batch A (Dead Convex functions)
1. Delete `suggestVideoGoal` action from `convex/ai.ts`
2. Delete `projects.list` query from `convex/projects.ts`
3. Deprecate `templateId` in `projects.create` (comment only, keep arg)
4. Add NOTE on `reflections.getByProject`

### Batch B (Orphaned files + config)
1. Delete `lib/shotlists/` directory
2. Remove `pages/**` from `tailwind.config.ts` content
3. Add `icon-192.png` and `icon-512.png` to `public/`

### Batch C (Consolidation + docs)
1. Extract `hasConvex` to `lib/convex/has-convex.ts`
2. Update governance docs
3. Finalize cleanup deliverables
