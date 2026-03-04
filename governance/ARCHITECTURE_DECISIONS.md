# Architecture Decisions

Record of key design choices for Shotlyst.

## 1. AI-only new-project flow

**Decision:** New project creation uses a single form (location, content type, goal, audience). On submission the project is created and `generatePlan(projectId)` is called. AI (Gemini) produces goal, hook, style, and context-aware scenes.

**Rationale:** Simplifies onboarding to one path. Removes template picker complexity; the AI path already generates high-quality, location-relevant shot lists.

**Previous approach (removed):** Two paths — "Start from template" and "Let AI suggest shots" — with a client-side template definition layer (`lib/shotlists/`). Removed after user testing showed one path is clearer.

---

## 2. Shots schema — shared with optional `purpose`

**Decision:** Shots table is shared between AI-generated and any future template-seeded plans. Optional `purpose` field stores a hint (e.g. "Pattern interrupt — grab attention in the first 1-2 seconds").

**Rationale:** One shot shape for all sources; purpose is optional so AI-created shots carry it when present.

---

## 3. Strong moments (AI video analysis)

**Decision:** After a creator uploads a video for a scene in Capture mode, the app can call `analyzeVideoForStrongMoments` which sends the video to Gemini 1.5 Flash. The response contains timestamped "strong moments" with reasons, saved to the shot record.

**Rationale:** Second AI use case, directly tied to helping creators identify their best footage for editing.

---

## 4. `hasConvex` shared helper

**Decision:** The check for whether the Convex deployment URL is configured lives in `lib/convex/has-convex.ts`. All pages/components import from there instead of inlining the check.

**Rationale:** Eliminates duplication (was in 3 files) and provides a single point of change if the detection logic evolves.

---

## 5. Drag-and-drop shot reordering (Plan page)

**Decision:** Uses `@dnd-kit` (core + sortable) for drag-and-drop reordering of shots on the Plan page. The `reorderShots` Convex mutation updates `order` fields.

**Rationale:** Proven library with good touch support, aligns with mobile-first UX. Badge numbers update dynamically with reordering.

---

## 6. `templateId` on projects (deprecated)

**Decision:** The `templateId` optional field on the `projects` table is kept in the schema and `create` mutation but marked as deprecated. No frontend code passes it.

**Rationale:** Safe to leave in place; removal is deferred to a future cleanup after confirming no production data relies on it.
