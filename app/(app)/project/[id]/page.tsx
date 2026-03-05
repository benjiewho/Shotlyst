"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
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
  if (url === undefined) return <div className="w-16 h-16 rounded-lg bg-muted animate-pulse" />;
  if (url === null) return <div className="w-16 h-16 rounded-lg bg-muted text-xs flex items-center justify-center text-muted-foreground">Unavailable</div>;
  return (
    <video
      src={url}
      className="w-16 h-16 rounded-lg object-cover bg-muted"
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
  generateUploadUrl,
  linkScene,
}: {
  shot: { _id: Id<"shots">; title: string; description: string; shotCategory?: string | null; purpose?: string | null; status?: string; sceneStorageId?: Id<"_storage"> | null };
  index: number;
  projectId: Id<"projects">;
  updateShot: (args: { shotId: Id<"shots">; title?: string; description?: string; shotCategory?: ShotCategoryValue }) => Promise<unknown>;
  removeShot: (args: { shotId: Id<"shots"> }) => Promise<unknown>;
  generateUploadUrl: () => Promise<string>;
  linkScene: (args: { shotId: Id<"shots">; storageId: Id<"_storage">; duration: number }) => Promise<unknown>;
}) {
  const [isReplacing, setIsReplacing] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
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
        "flex gap-3 items-start py-4",
        shot.status === "captured" && "bg-green-100 dark:bg-green-900/30",
        shot.status !== "captured" && !isDragging && "bg-primary/10 dark:bg-primary/20",
        isDragging && "opacity-50"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium mt-0.5",
          shot.status === "captured"
            ? "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100"
            : "bg-primary text-primary-foreground"
        )}
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={shot.shotCategory ?? "establishing_shot"}
            onChange={(e) =>
              updateShot({
                shotId: shot._id,
                shotCategory: e.target.value as ShotCategoryValue,
              })
            }
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
          >
            {SHOT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Delete shot"
            onClick={async () => {
              await removeShot({ shotId: shot._id });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            defaultValue={shot.title}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== shot.title)
                updateShot({ shotId: shot._id, title: v });
            }}
            className="flex-1 min-w-0 rounded-lg border border-input bg-background px-2 py-1 text-sm font-medium"
          />
          <button
            type="button"
            className="touch-none p-1.5 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0 self-center"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
        {shot.status === "captured" && shot.sceneStorageId && (
          <div className="flex items-center gap-2 flex-wrap">
            <SceneThumbnail storageId={shot.sceneStorageId} />
            <input
              ref={replaceInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              aria-label="Replace video"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file || isReplacing) return;
                setIsReplacing(true);
                try {
                  const url = URL.createObjectURL(file);
                  const video = document.createElement("video");
                  video.preload = "metadata";
                  const duration = await new Promise<number>((resolve, reject) => {
                    video.onloadedmetadata = () => {
                      resolve(Number.isFinite(video.duration) ? video.duration : 0);
                      URL.revokeObjectURL(url);
                    };
                    video.onerror = () => reject(new Error("Could not read video"));
                    video.src = url;
                  });
                  const uploadUrl = await generateUploadUrl();
                  const contentType = file.type.split(";")[0].trim() || "video/webm";
                  const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": contentType },
                    body: file,
                  });
                  if (!result.ok) {
                    const body = await result.text();
                    throw new Error(body ? `${result.status}: ${body}` : `Upload failed (${result.status})`);
                  }
                  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
                  await linkScene({ shotId: shot._id, storageId, duration: Math.round(duration) });
                } finally {
                  setIsReplacing(false);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isReplacing}
              onClick={() => replaceInputRef.current?.click()}
            >
              {isReplacing ? "Replacing…" : "Replace"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/project/${projectId}/capture?shot=${shot._id}`}>
                Retake
              </Link>
            </Button>
          </div>
        )}
        <textarea
          defaultValue={shot.description}
          onBlur={(e) => {
            const v = e.target.value;
            if (v !== shot.description)
              updateShot({ shotId: shot._id, description: v });
          }}
          className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs text-muted-foreground min-h-[60px]"
          placeholder="Description / notes…"
        />
      </div>
    </li>
  );
}

export default function ProjectPlanPage() {
  const params = useParams();
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
  const generateUploadUrl = useMutation(api.shots.generateUploadUrl);
  const linkScene = useMutation(api.shots.linkScene);
  const generatePlan = useAction(api.ai.generatePlan);
  const regenerateHook = useAction(api.ai.regenerateHook);
  const regenerateStyle = useAction(api.ai.regenerateStyle);

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
          <p><span className="font-medium text-foreground">Scene generation:</span> {planSourceLabel}</p>
          {planUpdatedAt && <p>Plan updated: {planUpdatedAt}</p>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isRegeneratingPlan}
            onClick={() => setRegenerateDialogMode("regenerate")}
          >
            {isRegeneratingPlan ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isRegeneratingPlan}
            onClick={() => setRegenerateDialogMode("save-and-regenerate")}
          >
            {isRegeneratingPlan ? "Regenerating…" : "Save & Regenerate"}
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
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
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
              variant="ghost"
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
              {regeneratingHook ? "Regenerating…" : "Regenerate"}
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
              variant="ghost"
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
              {regeneratingStyle ? "Regenerating…" : "Regenerate"}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.recommendedStyle || "No style notes."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Shot list</CardTitle>
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
          </CardHeader>
          <CardContent>
            {shots === undefined ? (
              <p className="text-sm text-muted-foreground">Loading shots…</p>
            ) : shots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shots in this plan. Add one above.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">
                    {shots.filter((s) => s.status === "captured").length} of {shots.length} shots captured
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
                  <ol className="divide-y divide-border">
                    {shots.map((shot, i) => (
                      <SortableShotRow
                        key={shot._id}
                        shot={shot}
                        index={i}
                        projectId={projectId!}
                        updateShot={updateShot}
                        removeShot={removeShot}
                        generateUploadUrl={generateUploadUrl}
                        linkScene={linkScene}
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
        <Button className="w-full min-h-12" size="lg" asChild>
          <Link href={`/project/${project._id}/capture`}>Let&apos;s Capture</Link>
        </Button>
        <Button variant="outline" className="w-full min-h-12" size="lg" asChild>
          <Link href={`/project/${project._id}/report`}>View report</Link>
        </Button>
      </div>
    </div>
  );
}
