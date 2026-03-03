"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const strongMomentsShots = shots
    .filter((s) => s.status === "captured")
    .slice(0, 3);

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <header className="flex items-center gap-2 mb-6">
        <Link
          href={`/project/${project._id}/capture`}
          className="p-2 -ml-2 text-foreground rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          aria-label="Back"
        >
          ←
        </Link>
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
            <CardTitle className="text-base">Strong moments</CardTitle>
          </CardHeader>
          <CardContent>
            {strongMomentsShots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No captured clips yet. Complete shots in Capture mode to see strong moments here.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {strongMomentsShots.map((s) => (
                  <li key={s._id}>
                    <span className="font-medium text-foreground">{s.title}</span>
                    {s.sceneDuration != null && (
                      <span className="ml-1">({s.sceneDuration}s)</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
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
