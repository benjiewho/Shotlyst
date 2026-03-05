"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function buildEditGuideText(
  projectName: string,
  goalSummary: string,
  suggestedHook: string,
  recommendedStyle: string,
  shots: { title: string; description: string; status: string }[]
): string {
  const lines: string[] = [
    `# Edit guide — ${projectName}`,
    "",
    "## Goal",
    goalSummary || "(No goal summary)",
    "",
    "## Suggested hook",
    suggestedHook || "(No hook)",
    "",
    "## Style",
    recommendedStyle || "(No style notes)",
    "",
    "## Shot list",
  ];
  const captured = shots.filter((s) => s.status === "captured");
  const missing = shots.filter((s) => s.status !== "captured");
  shots.forEach((s, i) => {
    const status = s.status === "captured" ? "✓" : s.status === "skipped" ? "−" : "○";
    lines.push(`${i + 1}. [${status}] ${s.title}`);
    lines.push(`   ${s.description}`);
  });
  if (missing.length > 0) {
    lines.push("");
    lines.push("## Missing / not captured");
    missing.forEach((s) => lines.push(`- ${s.title}`));
  }
  lines.push("");
  lines.push(`Coverage: ${captured.length} of ${shots.length} shots captured.`);
  return lines.join("\n");
}

function ReportSceneThumbnail({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.shots.getSceneUrl, { storageId });
  if (url === undefined) return <div className="aspect-video w-24 rounded-lg bg-muted animate-pulse" />;
  if (url === null) return <div className="aspect-video w-24 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>;
  return (
    <video
      src={url}
      className="aspect-video w-24 rounded-lg object-cover bg-muted"
      muted
      playsInline
      preload="metadata"
    />
  );
}

export default function ReportPage() {
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

  const handleExportEditGuide = () => {
    if (!project || !shots) return;
    const text = buildEditGuideText(
      project.name,
      project.goalSummary,
      project.suggestedHook,
      project.recommendedStyle,
      shots.map((s) => ({
        title: s.title,
        description: s.description,
        status: s.status,
      }))
    );
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, "_")}_edit_guide.txt`;
    a.click();
    URL.revokeObjectURL(url);
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

  const capturedCount = shots.filter((s) => s.status === "captured").length;
  const totalShots = shots.length;
  const missingShots = shots.filter((s) => s.status !== "captured");

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground truncate">
          {project.name}
        </h1>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground font-medium">
              {capturedCount} of {totalShots} key shots captured
            </p>
            {totalShots > 0 && (
              <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${totalShots ? (capturedCount / totalShots) * 100 : 0}%`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {missingShots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Missing shots</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {missingShots.map((s) => (
                  <li key={s._id}>
                    {s.status === "skipped" ? "− " : "○ "}
                    {s.title}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shot list</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y-2 divide-primary/20">
              {shots.map((s, i) => (
                <li
                  key={s._id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-4 first:rounded-t-lg last:rounded-b-lg",
                    s.status === "captured" && "bg-green-100 dark:bg-green-900/30",
                    s.status !== "captured" && "bg-primary/10 dark:bg-primary/20"
                  )}
                >
                  {s.status === "captured" && s.sceneStorageId ? (
                    <ReportSceneThumbnail storageId={s.sceneStorageId} />
                  ) : (
                    <div className="aspect-video w-24 shrink-0 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No clip
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium text-foreground break-words">
                      {i + 1}. {s.title}
                    </p>
                    {s.status !== "captured" && (
                      <Button variant="outline" size="sm" className="mt-1 w-full sm:w-auto" asChild>
                        <Link href={`/project/${project._id}/capture?shot=${s._id}`}>
                          Capture this shot
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full min-h-12"
            size="lg"
            variant="outline"
            asChild
          >
            <Link href={`/project/${project._id}/capture`}>Recapture Scenes</Link>
          </Button>
          <Button
            className="w-full min-h-12"
            size="lg"
            variant="outline"
            onClick={handleExportEditGuide}
          >
            Export edit guide
          </Button>
          <Button className="w-full min-h-12" size="lg" asChild>
            <Link href={`/project/${project._id}/reflect`}>
              Log performance later
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
