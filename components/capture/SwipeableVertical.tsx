"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 50;

export function SwipeableVertical({
  children,
  onSwipeUp,
  onSwipeDown,
  className,
}: {
  children: React.ReactNode;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  className?: string;
}) {
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - touchStartY.current;
      if (deltaY < -SWIPE_THRESHOLD_PX) {
        onSwipeUp();
      } else if (deltaY > SWIPE_THRESHOLD_PX) {
        onSwipeDown();
      }
      touchStartY.current = null;
    },
    [onSwipeUp, onSwipeDown]
  );

  return (
    <div
      className={cn("touch-pan-y", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}
