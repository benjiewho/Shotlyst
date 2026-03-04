# Cleanup Candidates — Evidence

## 1. `suggestVideoGoal` (convex/ai.ts)

**Search:** `rg "suggestVideoGoal" --glob "*.{ts,tsx}"`

```
convex\ai.ts:234:export const suggestVideoGoal = action({
```

**Result:** Only match is the definition itself. Zero frontend imports, zero Convex internal calls.

**Decision:** DELETE

---

## 2. `projects.list` (convex/projects.ts)

**Search:** `rg "api\.projects\.list\b" --glob "*.{ts,tsx}"` — No matches  
**Search:** `rg "projects\.list[^W]" --glob "*.{ts,tsx}"` — No matches  
**Search:** `rg '"list"' convex/ --glob "*.{ts,tsx}"` — No matches

**Result:** Zero references. `listWithProgress` fully replaces it on the dashboard.

**Decision:** DELETE

---

## 3. `templateId` in `projects.create` (convex/projects.ts)

**Search:** `rg "templateId" --glob "*.{ts,tsx}"`

```
convex\schema.ts:73:    templateId: v.optional(v.string()),
convex\projects.ts:66:    templateId: v.optional(v.string()),
convex\projects.ts:79:      templateId: args.templateId,
```

**Result:** Schema field exists (optional). `create` mutation accepts it (optional). No frontend code passes it. Previously used by template flow which was removed.

**Decision:** DEPRECATE (add comment). Do NOT remove arg — already optional, removal is safe for later after confirming no usage in production data.

---

## 4. `reflections.getByProject` (convex/reflections.ts)

**Search:** `rg "getByProject" --glob "*.{ts,tsx}"`

```
convex\reflections.ts:5:export const getByProject = query({
```

**Result:** Only the definition. Not called from frontend or other Convex functions.

**Decision:** ADD NOTE. Likely needed for future "view existing reflection" feature. Do not delete.

---

## 5. `lib/shotlists/` module

**Search:** `rg "@/lib/shotlists|lib/shotlists|from.*shotlists" --glob "*.{ts,tsx}"` — No matches

**Result:** Zero imports anywhere. Entire module is orphaned after new-project flow was simplified to AI-only.

**Decision:** DELETE directory

---

## 6. `pages/**` in tailwind.config.ts

**Search:** `ls pages/` — directory does not exist

**Result:** App Router only; no `pages/` directory. Content path is dead.

**Decision:** REMOVE from content array

---

## 7. `hasConvex` duplication

**Search:** `rg "hasConvex" --glob "*.{ts,tsx}"`

```
app\(app)\dashboard\page.tsx:10,131
app\(app)\profile\page.tsx:10,203
components\auth\convex-auth-guard.tsx:34,37
```

**Result:** Same 3-line check in 3 files.

**Decision:** EXTRACT to shared `lib/convex/has-convex.ts`

---

## 8. `projects.updatePlan` (convex/projects.ts)

**Search:** `rg "updatePlan" --glob "*.{ts,tsx}"`

```
convex\ai.ts:149:    await ctx.runMutation(api.projects.updatePlan, {
convex\projects.ts:91:export const updatePlan = mutation({
```

**Result:** Called internally from `convex/ai.ts` `generatePlan` action. NOT dead code — backend-only.

**Decision:** LEAVE (backend-only, in active use)
