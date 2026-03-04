/**
 * Check whether the Convex deployment URL is configured.
 * Used to gate Convex-dependent UI so the app renders gracefully
 * when running without a backend (e.g. during static builds).
 */
export const hasConvex =
  typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string" &&
  process.env.NEXT_PUBLIC_CONVEX_URL.length > 0;
