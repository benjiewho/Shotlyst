# Shotlyst

Mobile-first web app that helps travel creators plan, capture, and review short-form video projects with AI guidance.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in values.
3. Run Convex: `npx convex dev` (creates project and sets `NEXT_PUBLIC_CONVEX_URL` in `.env.local`).
4. Configure Convex Auth: run `npx @convex-dev/auth` and follow the prompts to set SITE_URL and generate/set JWT_PRIVATE_KEY and JWKS on your Convex deployment. Then in Convex dashboard → Settings → Environment variables, add Google OAuth: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (from Google Cloud Console; callback URL = `https://<your-deployment>.convex.site/api/auth/callback/google`).
5. Run the app: `npm run dev`

## PWA Icons

Add `public/icon-192.png` and `public/icon-512.png` for the app manifest. The manifest references these for installability.

## Tech Stack

- Next.js 15 (App Router), TailwindCSS, shadcn/ui
- Convex (database, auth, file storage)
- Google Gemini (AI plan generation)
- MediaRecorder API (camera capture)
