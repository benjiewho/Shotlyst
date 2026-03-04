# Build Status

Status of features and phases for Shotlyst.

## Features

| Feature | Status |
|--------|--------|
| Auth (Convex Auth: Google + email/password) | Done |
| Dashboard (project list with progress) | Done |
| User profile (creator level, platform, travel focus) | Done |
| Project CRUD (create, plan, capture, report) | Done |
| AI plan generation (Gemini: goal, hook, style, context-aware shots) | Done |
| Plan editing (goal, hook, style; shot list CRUD, drag-drop reorder) | Done |
| Capture (camera + gallery, upload, review stored video, progress bar) | Done |
| Strong moments (AI video analysis per scene) | Done |
| Report (coverage, missing shots, recapture link) | Done |
| Reflection (5-step wizard) | Done |
| Breadcrumb navigation (Project name > Page) | Done |

## Removed features

| Feature | Reason |
|---------|--------|
| Template-based plan (Core Story, Talking + B-Roll, Travel) | Replaced by AI-only flow; templates in `lib/shotlists/` deleted |
| "Get AI ideas" button on new-project page | Removed to simplify; AI generates everything on form submit |
| `suggestVideoGoal` Convex action | Dead code; no frontend callers |
| `projects.list` Convex query | Replaced by `listWithProgress` |

## Tech stack

- Next.js 15 (App Router), React 18, TypeScript
- Convex (DB, auth, file storage)
- TailwindCSS, shadcn/ui
- Google Gemini API (plan generation, strong moments analysis)
- @dnd-kit (drag-and-drop reordering)
