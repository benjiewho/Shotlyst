"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Trash2, GripVertical } from "lucide-react";
import { ReplaceVideoModal } from "@/components/replace-video-modal";
import { useShotCapture } from "@/components/capture/useShotCapture";
import { ShotCapturePanel } from "@/components/capture/ShotCapturePanel";
import { SwipeableVertical } from "@/components/capture/SwipeableVertical";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SHOT_CATEGORIES = [
  { value: "hook_shot", label: "Hook shot" },
  { value: "establishing_shot", label: "Establishing shot" },
  { value: "action_shots", label: "Action shots" },
  { value: "detail_broll", label: "Detail/B-roll" },
] as const;
type ShotCategoryValue = (typeof SHOT_CATEGORIES)[number]["value"];

type EditField = "goal" | null;

function SceneThumbnail({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.shots.getSceneUrl, { storageId });
  if (url === undefined) return <div className="aspect-video w-40 shrink-0 rounded-lg bg-muted animate-pulse" />;
  if (url === null) return <div className="aspect-video w-40 shrink-0 rounded-lg bg-muted text-xs flex items-center justify-center text-muted-foreground">Unavailable</div>;
  return (
    <video
      src={url}
      className="aspect-video w-40 shrink-0 rounded-lg object-cover bg-muted"
      muted
      playsInline
      autoPlay
      loop
      preload="auto"
    />
  );
}

function SortableShotRow({
  shot,
  index,
  projectId,
  updateShot,
  removeShot,
  onOpenReplaceModal,
  isActive,
  onSetActiveShot,
  expandedContent,
}: {
  shot: { _id: Id<"shots">; title: string; description: string; shotCategory?: string | null; purpose?: string | null; status?: string; sceneStorageId?: Id<"_storage"> | null; order?: number; sceneDuration?: number | null; strongMoments?: { timestampSeconds: number; reason: string }[] | null; sceneFeedback?: { alignmentSummary: string; pros: string[]; cons: string[] } | null; sceneNotes?: string | null };
  index: number;
  projectId: Id<"projects">;
  updateShot: (args: { shotId: Id<"shots">; title?: string; description?: string; shotCategory?: ShotCategoryValue; sceneNotes?: string }) => Promise<unknown>;
  removeShot: (args: { shotId: Id<"shots"> }) => Promise<unknown>;
  onOpenReplaceModal: (shotId: Id<"shots">) => void;
  isActive?: boolean;
  onSetActiveShot?: () => void;
  expandedContent?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shot._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 rounded-xl px-4 py-4",
        shot.status === "captured" && "bg-green-100 dark:bg-green-900/30",
        shot.status !== "captured" && !isDragging && "bg-primary/10 dark:bg-primary/20",
        isDragging && "opacity-50",
        isActive && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Top row: drag handle (center), delete (right) */}
      <div className="grid grid-cols-3 items-center">
        <div />
        <button
          type="button"
          className="col-start-2 justify-self-center touch-none p-1.5 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/80"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="col-start-3 justify-self-end h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label="Delete shot"
          onClick={async () => {
            await removeShot({ shotId: shot._id });
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-3 items-start min-w-0">
        <button
          type="button"
          onClick={onSetActiveShot}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
            shot.status === "captured"
              ? "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 hover:ring-2 hover:ring-green-600"
              : "bg-primary text-primary-foreground hover:ring-2 hover:ring-primary",
            isActive && "ring-2 ring-offset-2 ring-primary"
          )}
          aria-label={isActive ? "Selected for capture" : "Select to capture this shot"}
        >
          {index + 1}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">Shot type</label>
            <select
              value={shot.shotCategory ?? "establishing_shot"}
              onChange={(e) =>
                updateShot({
                  shotId: shot._id,
                  shotCategory: e.target.value as ShotCategoryValue,
                })
              }
              className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs"
            >
              {SHOT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">Title</label>
            <textarea
              defaultValue={shot.title}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== shot.title)
                  updateShot({ shotId: shot._id, title: v });
              }}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-2 py-1 text-sm font-medium resize-none break-words"
            />
          </div>
          {shot.status === "captured" && shot.sceneStorageId ? (
            <div className="flex items-center gap-2 flex-wrap">
              <SceneThumbnail storageId={shot.sceneStorageId} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenReplaceModal(shot._id)}
              >
                Replace
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSetActiveShot}
            >
              Add video
            </Button>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">Description</label>
            <textarea
              defaultValue={shot.description}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== shot.description)
                  updateShot({ shotId: shot._id, description: v });
              }}
              className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs text-muted-foreground resize-none"
              placeholder="Description / notes…"
              rows={5}
            />
          </div>
        </div>
      </div>

      {isActive && expandedContent != null && (
        <div className="mt-2 border-t border-border pt-3">
          {expandedContent}
        </div>
      )}
    </li>
  );
}

export default function ProjectPlanPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  const projectId = id as Id<"projects"> | undefined;

  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId } : "skip"
  );
  const shots = useQuery(
    api.shots.listByProject,
    projectId ? { projectId } : "skip"
  );
  const updatePlanFields = useMutation(api.projects.updatePlanFields);
  const clearShotsForProject = useMutation(api.projects.clearShotsForProject);
  const updateShot = useMutation(api.shots.updateShot);
  const removeShot = useMutation(api.shots.remove);
  const createOneShot = useMutation(api.shots.createOne);
  const reorderShots = useMutation(api.shots.reorderShots);
  const linkScene = useMutation(api.shots.linkScene);
  const unassignShot = useMutation(api.shots.unassignShot);
  const generatePlan = useAction(api.ai.generatePlan);
  const analyzeStrongMoments = useAction(api.ai.analyzeVideoForStrongMoments);
  const convex = useConvex();
  const [replaceModalShotId, setReplaceModalShotId] = useState<Id<"shots"> | null>(null);
  const [shotListViewMode, setShotListViewMode] = useState<"editor" | "capture">("editor");
  const regenerateHook = useAction(api.ai.regenerateHook);
  const regenerateStyle = useAction(api.ai.regenerateStyle);

  const sortedShots = useMemo(
    () => (shots ? [...shots].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []),
    [shots]
  );
  const firstUnassignedShot = useMemo(
    () => sortedShots.find((s) => s.status !== "captured") ?? sortedShots[0] ?? null,
    [sortedShots]
  );
  const [activeShotId, setActiveShotId] = useState<Id<"shots"> | null>(null);
  const hasInitializedActiveRef = useRef(false);

  useEffect(() => {
    if (!projectId || !shots?.length) {
      hasInitializedActiveRef.current = false;
      return;
    }
    if (hasInitializedActiveRef.current) return;
    const shotParam = searchParams.get("shot");
    const paramId = shotParam as Id<"shots"> | null;
    if (paramId && shots.some((s) => s._id === paramId)) {
      setActiveShotId(paramId);
    } else {
      setActiveShotId(firstUnassignedShot?._id ?? shots[0]._id);
    }
    hasInitializedActiveRef.current = true;
  }, [projectId, shots, searchParams, firstUnassignedShot]);

  const activeShot = useMemo(
    () => (activeShotId ? sortedShots.find((s) => s._id === activeShotId) ?? null : null),
    [activeShotId, sortedShots]
  );
  const activeIndex = useMemo(
    () => (activeShotId ? sortedShots.findIndex((s) => s._id === activeShotId) : -1),
    [activeShotId, sortedShots]
  );
  const nextShotId = useMemo(() => {
    if (sortedShots.length === 0) return null;
    const nextIndex = (activeIndex + 1 + sortedShots.length) % sortedShots.length;
    return sortedShots[nextIndex]._id;
  }, [sortedShots, activeIndex]);
  const prevShotId = useMemo(() => {
    if (sortedShots.length === 0) return null;
    const prevIndex = (activeIndex - 1 + sortedShots.length) % sortedShots.length;
    return sortedShots[prevIndex]._id;
  }, [sortedShots, activeIndex]);
  const nextUnassignedAfterActive = useMemo(() => {
    if (!activeShot) return firstUnassignedShot;
    const after = sortedShots.filter((s) => (s.order ?? 0) > (activeShot.order ?? 0) && s.status !== "captured");
    return after[0] ?? sortedShots.find((s) => s.status !== "captured") ?? null;
  }, [sortedShots, activeShot, firstUnassignedShot]);

  const {
    recordedBlob,
    recordedBlobUrl,
    isUploading,
    uploadProgress,
    error,
    setError,
    uploadedStorageId,
    confirmCapture,
    retake,
    handleNativeCameraFile,
  } = useShotCapture({
    currentShot: activeShot,
    projectId,
    onAssigned: useCallback(() => {
      if (nextUnassignedAfterActive) setActiveShotId(nextUnassignedAfterActive._id);
      else setActiveShotId(sortedShots[0]?._id ?? null);
    }, [nextUnassignedAfterActive, sortedShots]),
  });

  const sceneUrl = useQuery(
    api.shots.getSceneUrl,
    activeShot?.status === "captured" && activeShot?.sceneStorageId
      ? { storageId: activeShot.sceneStorageId }
      : "skip"
  );
  const mediaForActiveShot = useQuery(
    api.media.listByShot,
    activeShot?.status === "captured" && activeShot?._id ? { shotId: activeShot._id } : "skip"
  );
  const assignedVideoInLibrary =
    !!activeShot?.sceneStorageId &&
    !!mediaForActiveShot?.some((m) => m.storageId === activeShot.sceneStorageId);

  const captureMode: "pre" | "post" | "assigned" =
    recordedBlob
      ? "post"
      : activeShot?.status === "captured" && activeShot?.sceneStorageId && sceneUrl
        ? "assigned"
        : "pre";

  const [revealedFeedbackShotId, setRevealedFeedbackShotId] = useState<Id<"shots"> | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const analysisTriggeredForShotsRef = useRef<Set<Id<"shots">>>(new Set());
  const prevActiveShotIdRef = useRef<Id<"shots"> | null>(null);

  useEffect(() => {
    const prev = prevActiveShotIdRef.current;
    prevActiveShotIdRef.current = activeShotId;
    if (prev !== null && prev !== activeShotId) retake();
  }, [activeShotId, retake]);

  useEffect(() => {
    if (!activeShot?.sceneStorageId) {
      if (activeShot?._id) analysisTriggeredForShotsRef.current.delete(activeShot._id);
      return;
    }
    const hasNoStrongMoments = !activeShot?.strongMoments || activeShot.strongMoments.length === 0;
    if (!hasNoStrongMoments) return;
    if (analysisTriggeredForShotsRef.current.has(activeShot._id)) return;
    analysisTriggeredForShotsRef.current.add(activeShot._id);
    void (async () => {
      await new Promise((r) => setTimeout(r, 2000));
      const videoUrl = await convex.query(api.shots.getSceneUrlByShotId, { shotId: activeShot._id });
      await analyzeStrongMoments({ shotId: activeShot._id, videoUrl: videoUrl ?? undefined });
    })().catch(() => {});
  }, [activeShot?._id, activeShot?.sceneStorageId, activeShot?.strongMoments, analyzeStrongMoments, convex]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!projectId || !over || active.id === over.id || !shots?.length) return;
    const shotIds = shots.map((s) => s._id);
    const oldIndex = shotIds.indexOf(active.id as Id<"shots">);
    const newIndex = shotIds.indexOf(over.id as Id<"shots">);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(shotIds, oldIndex, newIndex);
    await reorderShots({ projectId, shotIds: newOrder });
  };

  const [editing, setEditing] = useState<EditField>(null);
  const [draftGoal, setDraftGoal] = useState("");
  const [regenerateDialogMode, setRegenerateDialogMode] = useState<"regenerate" | "save-and-regenerate" | null>(null);
  const [isRegeneratingPlan, setIsRegeneratingPlan] = useState(false);
  const [regeneratingHook, setRegeneratingHook] = useState(false);
  const [regeneratingStyle, setRegeneratingStyle] = useState(false);
  const regenerateInFlightRef = useRef(false);

  if (projectId && project === undefined) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">Loading project…</p>
      </div>
    );
  }

  if (!projectId || !project) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Project not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!project.planGenerated) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">Generating plan…</p>
          <p className="text-sm mt-1">Hang on a moment.</p>
        </div>
      </div>
    );
  }

  const startEdit = (field: EditField) => {
    if (!project) return;
    setEditing(field);
    if (field === "goal") setDraftGoal(project.goalSummary ?? "");
  };

  const saveEdit = async () => {
    if (!projectId || editing !== "goal") return;
    try {
      await updatePlanFields({ projectId, goalSummary: draftGoal });
      setEditing(null);
    } catch {
      // keep editing open on error
    }
  };

  const runFullPlanRegenerate = async () => {
    if (!projectId) return;
    if (regenerateDialogMode === "save-and-regenerate" && editing === "goal") {
      await updatePlanFields({ projectId, goalSummary: draftGoal });
      setEditing(null);
    }
    setRegenerateDialogMode(null);
    setIsRegeneratingPlan(true);
    try {
      await clearShotsForProject({ projectId });
      await generatePlan({ projectId });
    } catch (e) {
      console.error("Regenerate plan failed:", e);
    } finally {
      setIsRegeneratingPlan(false);
    }
  };

  const planSourceLabel = project.planSource === "gemini" ? "Gemini" : project.planSource === "stub" ? "Stub template" : "Unknown";
  const planUpdatedAt = project.updatedAt ? new Date(project.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <div className="mb-6 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
        <p className="text-sm font-medium text-foreground">Your plan is ready</p>
      </div>

      <div className="mb-4 rounded-lg bg-muted/60 border border-border px-3 py-2 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p><span className="font-medium text-foreground">Scene Generation by AI model:</span> {planSourceLabel}</p>
          {planUpdatedAt && <p>Plan updated: {planUpdatedAt}</p>}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isRegeneratingPlan}
            onClick={() => setRegenerateDialogMode("regenerate")}
          >
            {isRegeneratingPlan ? "Regenerating…" : "Regenerate"}
          </Button>
        </div>
      </div>

      <AlertDialog open={regenerateDialogMode !== null} onOpenChange={(open) => !open && setRegenerateDialogMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace entire plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the current plan and all captured videos for this project and generate a new goal, hook, style, and shot list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runFullPlanRegenerate}>
              Yes, replace plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Goal</CardTitle>
            {editing !== "goal" && (
              <Button variant="ghost" size="sm" onClick={() => startEdit("goal")}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing === "goal" ? (
              <div className="space-y-2">
                <textarea
                  value={draftGoal}
                  onChange={(e) => setDraftGoal(e.target.value)}
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Goal summary…"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={saveEdit}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRegeneratingPlan}
                    onClick={() => setRegenerateDialogMode("save-and-regenerate")}
                  >
                    {isRegeneratingPlan ? "Regenerating…" : "Save & Regenerate"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Save & Regenerate saves your goal and replaces the full plan (clears current shots and videos).</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {project.goalSummary || "No goal summary."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Suggested hook</CardTitle>
            <Button
              size="sm"
              disabled={regeneratingHook}
              onClick={async () => {
                if (!projectId) return;
                if (regenerateInFlightRef.current) return;
                regenerateInFlightRef.current = true;
                setRegeneratingHook(true);
                try {
                  const result = await regenerateHook({ projectId });
                  if (!result?.success) {
                    console.warn("Hook regeneration did not update.");
                  }
                } catch (e) {
                  console.error("Regenerate hook failed:", e);
                } finally {
                  regenerateInFlightRef.current = false;
                  setRegeneratingHook(false);
                }
              }}
            >
              {regeneratingHook ? "Refreshing…" : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.suggestedHook || "No hook suggested."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recommended style</CardTitle>
            <Button
              size="sm"
              disabled={regeneratingStyle}
              onClick={async () => {
                if (!projectId) return;
                if (regenerateInFlightRef.current) return;
                regenerateInFlightRef.current = true;
                setRegeneratingStyle(true);
                try {
                  const result = await regenerateStyle({ projectId });
                  if (!result?.success) {
                    console.warn("Style regeneration did not update.");
                  }
                } catch (e) {
                  console.error("Regenerate style failed:", e);
                } finally {
                  regenerateInFlightRef.current = false;
                  setRegeneratingStyle(false);
                }
              }}
            >
              {regeneratingStyle ? "Refreshing…" : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.recommendedStyle || "No style notes."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Shot list</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-input bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setShotListViewMode("editor")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    shotListViewMode === "editor"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShotListViewMode("capture");
                    if (!activeShotId && sortedShots.length > 0)
                      setActiveShotId(sortedShots[0]._id);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    shotListViewMode === "capture"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Capture
                </button>
              </div>
              {projectId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!projectId || shots === undefined) return;
                    await createOneShot({
                      projectId,
                      type: "nice",
                      shotCategory: "establishing_shot",
                      title: "New shot",
                      description: "Add your notes here.",
                      order: shots.length,
                    });
                  }}
                >
                  Add shot
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {shots === undefined ? (
              <p className="text-sm text-muted-foreground">Loading shots…</p>
            ) : shots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shots in this plan. Add one above.</p>
            ) : shotListViewMode === "capture" ? (
              <SwipeableVertical
                onSwipeUp={() => nextShotId && setActiveShotId(nextShotId)}
                onSwipeDown={() => prevShotId && setActiveShotId(prevShotId)}
                className="min-h-[70vh] flex flex-col"
              >
                <div className="rounded-xl border border-primary/30 bg-card p-4 flex flex-col gap-3">
                  {activeShot && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Scene {activeShot.order + 1} of {sortedShots.length}
                      </p>
                      <p className="text-sm font-medium text-foreground">{activeShot.title}</p>
                      {activeShot.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-3">{activeShot.description}</p>
                      ) : null}
                      <ShotCapturePanel
                        mode={captureMode}
                        shot={activeShot}
                        recordedBlobUrl={recordedBlobUrl}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                        error={error}
                        canAssign={!!uploadedStorageId}
                        onRetake={retake}
                        onAssign={confirmCapture}
                        nativeCameraInputRef={nativeCameraInputRef}
                        onOpenCamera={() => nativeCameraInputRef.current?.click()}
                        onCameraFileChange={handleNativeCameraFile}
                        onOpenGallery={() => setReplaceModalShotId(activeShotId)}
                        sceneUrl={captureMode === "assigned" ? sceneUrl ?? null : null}
                        onReplace={() => setReplaceModalShotId(activeShotId)}
                        onUnassign={async () => {
                          if (!activeShot?._id) return;
                          try {
                            await unassignShot({ shotId: activeShot._id });
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Unassign failed.");
                          }
                        }}
                        strongMoments={activeShot?.strongMoments ?? null}
                        sceneFeedback={activeShot?.sceneFeedback ?? null}
                        revealedFeedback={revealedFeedbackShotId === activeShot?._id}
                        onRevealFeedback={() => activeShot?._id && setRevealedFeedbackShotId(activeShot._id)}
                        reviewVideoRef={reviewVideoRef}
                        assignedVideoInLibrary={assignedVideoInLibrary}
                        compact
                      />
                      <div className="space-y-1 mt-3">
                        <label className="text-xs font-medium text-foreground">Notes &amp; reminders</label>
                        <textarea
                          defaultValue={activeShot.sceneNotes ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (activeShot.sceneNotes ?? ""))
                              updateShot({ shotId: activeShot._id, sceneNotes: v });
                          }}
                          placeholder="What to do or reminders for this scene…"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-y"
                        />
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">Swipe up/down to change scene</p>
              </SwipeableVertical>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">
                    {shots.filter((s) => s.status === "captured").length} of {shots.length} shots assigned
                  </span>
                  {shots.filter((s) => s.status === "captured").length === shots.length && shots.length > 0 ? (
                    <span className="text-muted-foreground font-medium text-primary">Project complete</span>
                  ) : null}
                </div>
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={shots.map((s) => s._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ol className="divide-y-2 divide-primary/20">
                    {shots.map((shot, i) => (
                      <SortableShotRow
                        key={shot._id}
                        shot={shot}
                        index={i}
                        projectId={projectId!}
                        updateShot={updateShot}
                        removeShot={removeShot}
                        onOpenReplaceModal={(id) => setReplaceModalShotId(id)}
                        isActive={activeShotId === shot._id}
                        onSetActiveShot={() => setActiveShotId(shot._id)}
                        expandedContent={
                          activeShotId === shot._id && activeShot && shotListViewMode === "editor" ? (
                            <>
                              <ShotCapturePanel
                                mode={captureMode}
                                shot={activeShot}
                                recordedBlobUrl={recordedBlobUrl}
                                isUploading={isUploading}
                                uploadProgress={uploadProgress}
                                error={error}
                                canAssign={!!uploadedStorageId}
                                onRetake={retake}
                                onAssign={confirmCapture}
                                nativeCameraInputRef={nativeCameraInputRef}
                                onOpenCamera={() => nativeCameraInputRef.current?.click()}
                                onCameraFileChange={handleNativeCameraFile}
                                onOpenGallery={() => setReplaceModalShotId(activeShotId)}
                                sceneUrl={captureMode === "assigned" ? sceneUrl ?? null : null}
                                onReplace={() => setReplaceModalShotId(activeShotId)}
                                onUnassign={async () => {
                                  if (!activeShot?._id) return;
                                  try {
                                    await unassignShot({ shotId: activeShot._id });
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : "Unassign failed.");
                                  }
                                }}
                                strongMoments={activeShot?.strongMoments ?? null}
                                sceneFeedback={activeShot?.sceneFeedback ?? null}
                                revealedFeedback={revealedFeedbackShotId === activeShot?._id}
                                onRevealFeedback={() => activeShot?._id && setRevealedFeedbackShotId(activeShot._id)}
                                reviewVideoRef={reviewVideoRef}
                                assignedVideoInLibrary={assignedVideoInLibrary}
                                compact
                              />
                              <div className="space-y-1 mt-3">
                                <label className="text-xs font-medium text-foreground">Notes &amp; reminders</label>
                                <textarea
                                  defaultValue={activeShot.sceneNotes ?? ""}
                                  onBlur={(e) => {
                                    const v = e.target.value;
                                    if (v !== (activeShot.sceneNotes ?? ""))
                                      updateShot({ shotId: activeShot._id, sceneNotes: v });
                                  }}
                                  placeholder="What to do or reminders for this scene…"
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-y"
                                />
                              </div>
                            </>
                          ) : undefined
                        }
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button
          className="w-full min-h-12"
          size="lg"
          onClick={() => firstUnassignedShot && setActiveShotId(firstUnassignedShot._id)}
        >
          Capture
        </Button>
        <Button variant="outline" className="w-full min-h-12" size="lg" asChild>
          <Link href={`/project/${project._id}/report`}>View report</Link>
        </Button>
      </div>

      {replaceModalShotId && (
        <ReplaceVideoModal
          open={true}
          onClose={() => setReplaceModalShotId(null)}
          projectId={projectId!}
          shotId={replaceModalShotId}
          shots={(shots ?? []).map((s) => ({ _id: s._id, sceneStorageId: s.sceneStorageId }))}
          linkScene={linkScene}
          analyzeStrongMoments={analyzeStrongMoments}
        />
      )}
    </div>
  );
}
