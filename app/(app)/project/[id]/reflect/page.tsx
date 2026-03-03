"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "How did this video make you feel?", key: "overallFeeling" },
  { title: "How well did it match your goal?", key: "goalAlignment" },
  { title: "Rate your top scenes", key: "sceneRatings" },
  { title: "How helpful was the shot list?", key: "aiHelpfulness" },
  { title: "Anything else?", key: "notes" },
] as const;

const SCALE = [1, 2, 3, 4, 5];

export default function ReflectPage() {
  const params = useParams();
  const router = useRouter();
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

  const createReflection = useMutation(api.reflections.create);
  const updateProjectStatus = useMutation(api.projects.updateStatus);

  const [step, setStep] = useState(1);
  const [overallFeeling, setOverallFeeling] = useState<number | null>(null);
  const [goalAlignment, setGoalAlignment] = useState<number | null>(null);
  const [sceneRatings, setSceneRatings] = useState<Record<string, number>>({});
  const [aiHelpfulness, setAiHelpfulness] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capturedShots = shots?.filter((s) => s.status === "captured") ?? [];
  const topShots = capturedShots.slice(0, 3);

  const canProceed =
    (step === 1 && overallFeeling != null) ||
    (step === 2 && goalAlignment != null) ||
    (step === 3 && topShots.length === 0) ||
    (step === 3 &&
      topShots.length > 0 &&
      topShots.every((s) => sceneRatings[s._id] != null)) ||
    (step === 4 && aiHelpfulness != null) ||
    step === 5;

  const handleNext = () => {
    if (step < 5) setStep((s) => s + 1);
    else handleFinish();
  };

  const handleFinish = async () => {
    if (!projectId || !project) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const sceneRatingsPayload = topShots.map((s) => ({
        shotId: s._id,
        rating: sceneRatings[s._id] ?? 3,
      }));
      await createReflection({
        projectId,
        overallFeeling: overallFeeling ?? 3,
        goalAlignment: goalAlignment ?? 3,
        sceneRatings: sceneRatingsPayload,
        aiHelpfulness: aiHelpfulness ?? 3,
        notes: notes.trim() || undefined,
      });
      await updateProjectStatus({ projectId, status: "complete" });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Invalid project.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (project === undefined || shots === undefined) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Project not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <header className="flex items-center gap-2 mb-6">
        <Link
          href={`/project/${project._id}/report`}
          className="p-2 -ml-2 text-foreground rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="text-xl font-semibold text-foreground truncate">
          Performance reflection
        </h1>
      </header>

      <div className="mb-6 flex gap-1">
        {SCALE.slice(0, 5).map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{STEPS[step - 1].title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="flex flex-wrap gap-2">
              {SCALE.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setOverallFeeling(n)}
                  className={cn(
                    "min-h-11 min-w-11 rounded-xl border text-sm font-medium transition-colors",
                    overallFeeling === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap gap-2">
              {SCALE.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGoalAlignment(n)}
                  className={cn(
                    "min-h-11 min-w-11 rounded-xl border text-sm font-medium transition-colors",
                    goalAlignment === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {topShots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No captured scenes to rate. You can skip this step.
                </p>
              ) : (
                topShots.map((shot) => (
                  <div key={shot._id}>
                    <p className="text-sm font-medium text-foreground mb-2">
                      {shot.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SCALE.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setSceneRatings((prev) => ({
                              ...prev,
                              [shot._id]: n,
                            }))
                          }
                          className={cn(
                            "min-h-9 min-w-9 rounded-lg border text-xs font-medium transition-colors",
                            sceneRatings[shot._id] === n
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-muted"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-wrap gap-2">
              {SCALE.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAiHelpfulness(n)}
                  className={cn(
                    "min-h-11 min-w-11 rounded-xl border text-sm font-medium transition-colors",
                    aiHelpfulness === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {step === 5 && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this project…"
              rows={4}
              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[88px]"
            />
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-12 flex-1"
            onClick={() => setStep((s) => s - 1)}
            disabled={isSubmitting}
          >
            Back
          </Button>
        ) : (
          <Button variant="outline" className="min-h-12 flex-1" asChild>
            <Link href={`/project/${project._id}/report`}>Back</Link>
          </Button>
        )}
        <Button
          type="button"
          className="min-h-12 flex-1"
          onClick={handleNext}
          disabled={!canProceed || isSubmitting}
        >
          {step < 5
            ? "Next"
            : isSubmitting
              ? "Finishing…"
              : "Finish project"}
        </Button>
      </div>
    </div>
  );
}
