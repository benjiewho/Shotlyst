"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 50;

export function SwipeableCaptureArea({
  children,
  onSwipeLeft,
  onSwipeRight,
  className,
}: {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  className?: string;
}) {
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const endX = e.changedTouches[0].clientX;
      const delta = endX - touchStartX.current;
      if (delta > SWIPE_THRESHOLD_PX) {
        onSwipeRight();
      } else if (delta < -SWIPE_THRESHOLD_PX) {
        onSwipeLeft();
      }
      touchStartX.current = null;
    },
    [onSwipeLeft, onSwipeRight]
  );

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <span
        className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xl select-none pointer-events-none"
        aria-hidden
      >
        ‹
      </span>
      <span
        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xl select-none pointer-events-none"
        aria-hidden
      >
        ›
      </span>
      {children}
    </div>
  );
}
