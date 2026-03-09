"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoItem({
  storageId,
  duration,
  onSelect,
  disabled,
}: {
  storageId: Id<"_storage">;
  duration: number;
  onSelect: () => void;
  disabled: boolean;
}) {
  const url = useQuery(api.media.getUrl, { storageId });
  if (url === undefined) {
    return (
      <div className="aspect-video w-full max-w-[200px] rounded-lg bg-muted animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    );
  }
  if (url === null) {
    return (
      <div className="aspect-video w-full max-w-[200px] rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
        Unavailable
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border overflow-hidden bg-card">
      <div className="aspect-video w-full max-w-[200px] bg-black">
        <video
          src={url}
          className="w-full h-full object-contain"
          muted
          playsInline
          autoPlay
          loop
          preload="auto"
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <span className="text-xs text-muted-foreground">{formatDuration(duration)}</span>
        <Button type="button" size="sm" onClick={onSelect} disabled={disabled}>
          Select
        </Button>
      </div>
    </div>
  );
}

type ShotWithStorage = { _id: Id<"shots">; sceneStorageId?: Id<"_storage"> };

export function ReplaceVideoModal({
  open,
  onClose,
  projectId,
  shotId,
  shots,
  linkScene,
}: {
  open: boolean;
  onClose: () => void;
  projectId: Id<"projects">;
  shotId: Id<"shots">;
  shots: ShotWithStorage[];
  linkScene: (args: { shotId: Id<"shots">; storageId: Id<"_storage">; duration: number }) => Promise<unknown>;
}) {
  const shotMedia = useQuery(
    api.media.listByShot,
    open ? { shotId } : "skip"
  );
  const [selectingStorageId, setSelectingStorageId] = useState<Id<"_storage"> | null>(null);

  const assignedStorageIdForThisShot = useMemo(
    () => shots.find((s) => s._id === shotId)?.sceneStorageId,
    [shots, shotId]
  );
  const unassignedMedia = useMemo(
    () => (shotMedia ?? []).filter((m) => m.storageId !== assignedStorageIdForThisShot),
    [shotMedia, assignedStorageIdForThisShot]
  );

  const handleSelect = async (storageId: Id<"_storage">, duration: number) => {
    if (selectingStorageId) return;
    setSelectingStorageId(storageId);
    try {
      await linkScene({ shotId, storageId, duration: Math.round(duration) });
      onClose();
    } finally {
      setSelectingStorageId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex flex-col w-full max-w-lg max-h-[85vh]",
          "rounded-xl border border-border bg-background shadow-xl overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Choose a video to assign</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {unassignedMedia.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No videos captured for this scene yet. Record or save one first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {unassignedMedia.map((m) => (
                <VideoItem
                  key={m._id}
                  storageId={m.storageId}
                  duration={m.duration}
                  onSelect={() => handleSelect(m.storageId, m.duration)}
                  disabled={selectingStorageId !== null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
