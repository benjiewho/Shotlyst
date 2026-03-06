# Shotlyst

Mobile-first web app that helps travel creators plan, capture, and review short-form video projects with AI guidance.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in values.
3. Run Convex: `npx convex dev` (creates project and sets `NEXT_PUBLIC_CONVEX_URL` in `.env.local`).
4. Configure Convex Auth: run `npx @convex-dev/auth` and follow the prompts to set SITE_URL and generate/set JWT_PRIVATE_KEY and JWKS on your Convex deployment. Then in Convex dashboard → Settings → Environment variables, add Google OAuth: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (from Google Cloud Console; callback URL = `https://<your-deployment>.convex.site/api/auth/callback/google`).

### Google OAuth checklist (if sign-in fails or Convex shows callback errors)

- **Google Cloud Console** (APIs & Services → Credentials → your OAuth 2.0 Client): **Authorized redirect URIs** must include the exact Convex auth callback URL for each environment (e.g. production: `https://<your-convex-deployment>.convex.site/api/auth/callback/google`; use the URL from Convex dashboard under Auth / HTTP routes if different).
- **Convex Dashboard** (Settings → Environment variables): `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` must match the Google client; the Convex deployment URL must match the redirect URI configured in Google.
- If Google sign-in still fails (e.g. on slow or unstable networks), ask the user to try again on a stable connection or sign in with email.
5. Run the app: `npm run dev`

## PWA Icons

Add `public/icon-192.png` and `public/icon-512.png` for the app manifest. The manifest references these for installability.

## Tech Stack

- Next.js 15 (App Router), TailwindCSS, shadcn/ui
- Convex (database, auth, file storage)
- Google Gemini (AI plan generation)
- MediaRecorder API (camera capture)
