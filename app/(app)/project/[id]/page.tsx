"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const SHOT_CATEGORIES = [
  { value: "hook_shot", label: "Hook shot" },
  { value: "establishing_shot", label: "Establishing shot" },
  { value: "action_shots", label: "Action shots" },
  { value: "detail_broll", label: "Detail/B-roll" },
] as const;
type ShotCategoryValue = (typeof SHOT_CATEGORIES)[number]["value"];

type EditField = "goal" | "hook" | "style" | null;

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
  const updateShot = useMutation(api.shots.updateShot);
  const removeShot = useMutation(api.shots.remove);
  const createOneShot = useMutation(api.shots.createOne);

  const [editing, setEditing] = useState<EditField>(null);
  const [draftGoal, setDraftGoal] = useState("");
  const [draftHook, setDraftHook] = useState("");
  const [draftStyle, setDraftStyle] = useState("");

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

  const typeLabel = (t: string) =>
    t === "must" ? "Must" : t === "nice" ? "Nice" : "Optional";

  const startEdit = (field: EditField) => {
    if (!project) return;
    setEditing(field);
    if (field === "goal") setDraftGoal(project.goalSummary ?? "");
    if (field === "hook") setDraftHook(project.suggestedHook ?? "");
    if (field === "style") setDraftStyle(project.recommendedStyle ?? "");
  };

  const saveEdit = async () => {
    if (!projectId || !editing) return;
    try {
      if (editing === "goal") await updatePlanFields({ projectId, goalSummary: draftGoal });
      if (editing === "hook") await updatePlanFields({ projectId, suggestedHook: draftHook });
      if (editing === "style") await updatePlanFields({ projectId, recommendedStyle: draftStyle });
      setEditing(null);
    } catch {
      // keep editing open on error
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <div className="mb-6 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
        <p className="text-sm font-medium text-foreground">Your plan is ready</p>
      </div>

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
            {editing !== "hook" && (
              <Button variant="ghost" size="sm" onClick={() => startEdit("hook")}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing === "hook" ? (
              <div className="space-y-2">
                <textarea
                  value={draftHook}
                  onChange={(e) => setDraftHook(e.target.value)}
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Suggested hook…"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {project.suggestedHook || "No hook suggested."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recommended style</CardTitle>
            {editing !== "style" && (
              <Button variant="ghost" size="sm" onClick={() => startEdit("style")}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing === "style" ? (
              <div className="space-y-2">
                <textarea
                  value={draftStyle}
                  onChange={(e) => setDraftStyle(e.target.value)}
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Recommended style…"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {project.recommendedStyle || "No style notes."}
              </p>
            )}
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
              <ol className="space-y-4">
                {shots.map((shot, i) => (
                  <li key={shot._id} className="flex gap-3 items-start">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium mt-0.5",
                        shot.type === "must"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-normal text-muted-foreground">
                          {typeLabel(shot.type)}
                        </span>
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
                      <input
                        type="text"
                        defaultValue={shot.title}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== shot.title)
                            updateShot({ shotId: shot._id, title: v });
                        }}
                        className="w-full rounded-lg border border-input bg-background px-2 py-1 text-sm font-medium"
                      />
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
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button className="w-full min-h-12" size="lg" asChild>
          <Link href={`/project/${project._id}/capture`}>Let&apos;s Capture</Link>
        </Button>
      </div>
    </div>
  );
}
