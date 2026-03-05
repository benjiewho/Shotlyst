"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Trash2 } from "lucide-react";

const CONTENT_TYPE_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  youtube_short: "YouTube Short",
  travel_diary: "Travel Diary",
};

function formatRelativeTime(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Id<"projects"> | null>(null);
  const listWithProgress = useQuery(api.projects.listWithProgress);
  const user = useQuery(api.users.getMe);
  const deleteProject = useMutation(api.projects.deleteProject);

  useEffect(() => {
    setMounted(true);
  }, []);

  const greeting =
    user?.name ?? user?.email?.split("@")[0] ?? "Hi there";
  const timeOfDay = mounted
    ? (() => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
      })()
    : "";

  if (listWithProgress === undefined) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-muted-foreground text-sm mb-6" suppressHydrationWarning>
        {mounted ? `${timeOfDay}, ${greeting}` : greeting}
      </p>

      <div className="flex flex-col gap-4">
        {listWithProgress.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No projects yet.</p>
            <p className="text-sm mt-1">
              Create your first project to get started.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {listWithProgress.map(({ project, capturedCount, totalShots, totalMediaCount }) => (
              <li key={project._id}>
                <Card
                  className={cn(
                    "border-border bg-card transition-opacity hover:opacity-95",
                    "min-h-[44px]"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/project/${project._id}`} className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {CONTENT_TYPE_LABEL[project.contentType] ??
                            project.contentType}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {capturedCount} of {totalShots} scenes assigned
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Total videos: {totalMediaCount}
                        </p>
                      </Link>
                      <div className="shrink-0 flex items-center gap-1">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {totalShots === 0
                              ? "No shots"
                              : `${Math.round(
                                  (capturedCount / totalShots) * 100
                                )}%`}
                          </p>
                          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                            {formatRelativeTime(project.updatedAt)}
                          </p>
                        </div>
                        <AlertDialog open={projectToDelete === project._id} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label="Delete project"
                            onClick={(e) => {
                              e.preventDefault();
                              setProjectToDelete(project._id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this project? This will permanently delete all scenes, videos, and reflections.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                                onClick={async () => {
                                  await deleteProject({ projectId: project._id });
                                  setProjectToDelete(null);
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {totalShots > 0 && (
                      <Link href={`/project/${project._id}`} className="block mt-2">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${(capturedCount / totalShots) * 100}%`,
                            }}
                          />
                        </div>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  if (!hasConvex) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm mb-6">Hi there</p>
        <div className="flex flex-col gap-4">
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">
              Add your Convex URL in .env.local to load projects.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return <DashboardContent />;
}
