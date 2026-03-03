"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
        <header className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 text-foreground rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            aria-label="Back"
          >
            ←
          </Link>
          <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
        </header>
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">Generating plan…</p>
          <p className="text-sm mt-1">Hang on a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <header className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 text-foreground rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="text-xl font-semibold text-foreground truncate">
          {project.name}
        </h1>
      </header>

      <div className="mb-6 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
        <p className="text-sm font-medium text-foreground">Your plan is ready</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.goalSummary || "No goal summary."}
            </p>
          </CardContent>
        </Card>

        {project.suggestedHook && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suggested hook</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {project.suggestedHook}
              </p>
            </CardContent>
          </Card>
        )}

        {project.recommendedStyle && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended style</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {project.recommendedStyle}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shot list</CardTitle>
          </CardHeader>
          <CardContent>
            {shots === undefined ? (
              <p className="text-sm text-muted-foreground">Loading shots…</p>
            ) : shots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shots in this plan.</p>
            ) : (
              <ol className="space-y-4">
                {shots.map((shot, i) => (
                  <li key={shot._id} className="flex gap-3">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                        shot.type === "must"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {shot.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {shot.description}
                      </p>
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
          <Link href={`/project/${project._id}/capture`}>Enter Capture Mode</Link>
        </Button>
      </div>
    </div>
  );
}
