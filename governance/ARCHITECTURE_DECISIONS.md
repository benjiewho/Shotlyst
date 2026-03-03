# Architecture Decisions

Record of key design choices for Shotlyst.

## 1. Shotlist template system

**Decision:** Templates are data-driven. Template definitions live in `lib/shotlists/` (TypeScript data + types); Convex stores only projects and shots. No template rows in the database for built-in templates.

**Rationale:** Keeps the app simple: UI is generic over template data, and new built-in templates can be added by editing config. User-defined or marketplace templates can be added later (e.g. Convex table or external config) without changing the core flow.

**Tradeoffs:** Template content is in code, so changing copy requires a deploy. Acceptable for v1.

---

## 2. Template path and AI path coexist

**Decision:** New project offers two paths: “Start from template” and “Let AI suggest shots.” Both use the same form (location, content type, goal, audience). Template path: create project with optional `templateId`, then seed shots from template via `createFromPlan`. AI path: create project, then call `generatePlan(projectId)` as today.

**Rationale:** Preserves existing AI flow and adds templates without breaking current users. Project has optional `templateId` for analytics and future features.

**Tradeoffs:** Two code paths for “how shots are created”; shared plan/capture/report logic keeps duplication low.

---

## 3. Shots schema shared; optional `purpose`

**Decision:** Shots table is shared between AI-generated and template-seeded plans. Optional `purpose` field stores the template “purpose hint” (e.g. “Pattern interrupt — grab attention in the first 1–2 seconds”) for display on Plan (and optionally Capture).

**Rationale:** One shot shape for all sources; purpose is optional so AI-created shots are unchanged. Plan page shows purpose when present.

---

## 4. Reuse `createFromPlan` for template shots

**Decision:** No separate “createFromTemplate” mutation. Client reads template from `lib/shotlists`, builds the shot array via `templateToShotsForCreate()`, and calls existing `shots.createFromPlan(projectId, shots)`.

**Rationale:** Avoids duplicating insert logic and keeps a single source of truth for “how shots are created from a list.” Template layer is client-side only; Convex stays unaware of template structure.

**Tradeoffs:** Client must have template definitions; no server-side validation of template shape. Acceptable while templates are built-in and trusted.
