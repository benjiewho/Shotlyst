# Build Status

Status of features and phases for Shotlyst.

## Features

| Feature | Status |
|--------|--------|
| Auth (Convex Auth: Google + email/password) | Done |
| Dashboard (project list with progress) | Done |
| User profile (creator level, platform, travel focus) | Done |
| Project CRUD (create, plan, capture, report) | Done |
| AI plan generation (Gemini: goal, hook, style, shot list) | Done |
| **Template-based plan** (Core Story, Talking + B-Roll, Travel) | Done |
| Plan editing (goal, hook, style; shot list CRUD) | Done |
| Capture (camera + gallery, upload, review stored video) | Done |
| Report (coverage, missing shots, export edit guide) | Done |
| Reflection (5-step wizard) | Done |

## Template system

- **Phase 1–3:** Done. Template definition layer (`lib/shotlists`), Convex schema (`templateId` on projects, `purpose` on shots), and new-project flow with “Start from template” vs “Let AI suggest shots” and template picker.
- **Phase 4:** Purpose hint on Plan page done; shot reorder (drag handle + `shots.reorderShots`) deferred to a follow-up.

## Tech stack

- Next.js 15 (App Router), React 18, TypeScript
- Convex (DB, auth, file storage)
- TailwindCSS, shadcn/ui
- Google Gemini API (plan generation, goal suggestions)
