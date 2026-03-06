"use client";

import { useConvexConnectionState } from "convex/react";

export function ConnectionBanner() {
  const connectionState = useConvexConnectionState();
  if (connectionState.isWebSocketConnected) return null;
  return (
    <div
      className="w-full py-2 px-4 text-center text-sm text-muted-foreground bg-muted/80 border-b border-border"
      role="status"
      aria-live="polite"
    >
      Connection unstable. Reconnecting…
    </div>
  );
}
