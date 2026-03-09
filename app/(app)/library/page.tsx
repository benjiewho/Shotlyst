"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { hasConvex } from "@/lib/convex/has-convex";
import { Trash2, ChevronDown, ChevronRight, Film, Download } from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function MediaThumbnail({
  storageId,
  duration,
  isAssigned,
  onAssign,
  onUnassign,
  onDelete,
  projectId,
  shotId,
  disabled,
}: {
  storageId: Id<"_storage">;
  duration: number;
  isAssigned: boolean;
  onAssign: () => void;
  onUnassign?: () => void;
  onDelete: () => void;
  projectId: Id<"projects">;
  shotId: Id<"shots">;
  disabled?: boolean;
}) {
  const url = useQuery(api.media.getUrl, { storageId });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (url === undefined || url === null) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `shotlyst-video-${storageId}.mp4`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }, [url, storageId]);

  if (url === undefined) {
    return (
      <div className="aspect-video w-full max-w-[160px] rounded-lg bg-muted animate-pulse flex items-center justify-center">
        <Film className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }
  if (url === null) {
    return (
      <div className="aspect-video w-full max-w-[160px] rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
        Unavailable
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-w-0 flex-1 max-w-full sm:max-w-[160px]">
      <div
        className={cn(
          "relative rounded-t-lg overflow-hidden border-2 border-b-0",
          isAssigned
            ? "border-green-600 dark:border-green-500 ring-2 ring-green-500/30"
            : "border-border"
        )}
      >
        <video
          src={url}
          className="aspect-video w-full object-cover block"
          muted
          playsInline
          preload="metadata"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 flex justify-between items-center">
          <span>{formatDuration(duration)}</span>
          {isAssigned && <span className="font-medium">Assigned</span>}
        </div>
      </div>
      <div
        className={cn(
          "flex gap-1 flex-wrap p-1 rounded-b-lg border-2 border-t-0",
          isAssigned
            ? "border-green-600 dark:border-green-500 bg-green-50/50 dark:bg-green-950/20"
            : "border-border bg-muted/30"
        )}
      >
        {!isAssigned && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onAssign}
            disabled={disabled}
          >
            Assign to Scene
          </Button>
        )}
        {isAssigned && onUnassign && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onUnassign}
            disabled={disabled}
          >
            Unassign
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handleDownload}
          disabled={disabled || downloading}
          aria-label="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="text-xs"
          onClick={() => setDeleteOpen(true)}
          disabled={disabled}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from library?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the video from your library. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                await onDelete();
                setDeleteOpen(false);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const library = useQuery(api.media.listLibrary);
  const linkScene = useMutation(api.shots.linkScene);
  const unassignShot = useMutation(api.shots.unassignShot);
  const removeMedia = useMutation(api.media.remove);
  const [assigningMediaId, setAssigningMediaId] = useState<Id<"media"> | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const projectIdFromUrl = searchParams.get("projectId");
  useEffect(() => {
    if (projectIdFromUrl) {
      setExpandedProjects((prev) => new Set(prev).add(projectIdFromUrl));
    }
  }, [projectIdFromUrl]);

  if (!hasConvex) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Add your Convex URL to view the library.</p>
      </div>
    );
  }

  if (library === undefined) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">Loading library…</p>
      </div>
    );
  }

  const hasAnyMedia = library.some((p) => p.shots.some((s) => s.media.length > 0));
  if (!hasAnyMedia) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold text-foreground mb-2">Library</h2>
        <div className="text-center py-12 text-muted-foreground rounded-xl border border-dashed border-border">
          <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No videos in your library yet.</p>
          <p className="text-xs mt-1">Use &quot;Save to Library&quot; when capturing to store clips here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-28">
      <h2 className="text-lg font-semibold text-foreground mb-4">Library</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Videos saved or used for scenes, grouped by project and scene.
      </p>
      <div className="space-y-2">
        {library.map((project) => {
          const projectKey = project.projectId;
          const isExpanded = expandedProjects.has(projectKey);
          const hasMedia = project.shots.some((s) => s.media.length > 0);
          if (!hasMedia) return null;

          return (
            <Card key={projectKey} className="overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 p-4 text-left font-medium text-foreground hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedProjects((prev) => {
                    const next = new Set(prev);
                    if (next.has(projectKey)) next.delete(projectKey);
                    else next.add(projectKey);
                    return next;
                  })
                }
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{project.projectName}</span>
              </button>
              {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-4">
                  {project.shots
                    .filter((shot) => shot.media.length > 0)
                    .map((shot) => (
                      <div key={shot.shotId} className="pl-6 space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Scene {shot.order + 1}: {shot.shotTitle}
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3">
                          {shot.media.map((m) => (
                            <MediaThumbnail
                              key={m.mediaId}
                              storageId={m.storageId as Id<"_storage">}
                              duration={m.duration}
                              isAssigned={shot.assignedStorageId === m.storageId}
                              projectId={project.projectId as Id<"projects">}
                              shotId={shot.shotId as Id<"shots">}
                              disabled={assigningMediaId !== null}
                              onAssign={async () => {
                                setAssigningMediaId(m.mediaId as Id<"media">);
                                try {
                                  await linkScene({
                                    shotId: shot.shotId as Id<"shots">,
                                    storageId: m.storageId as Id<"_storage">,
                                    duration: m.duration,
                                  });
                                } finally {
                                  setAssigningMediaId(null);
                                }
                              }}
                              onUnassign={
                                shot.assignedStorageId
                                  ? async () => {
                                      await unassignShot({ shotId: shot.shotId as Id<"shots"> });
                                    }
                                  : undefined
                              }
                              onDelete={async () => {
                                await removeMedia({ mediaId: m.mediaId as Id<"media"> });
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
