"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const hasConvex =
  typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string" &&
  process.env.NEXT_PUBLIC_CONVEX_URL.length > 0;

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
  const listWithProgress = useQuery(api.projects.listWithProgress);
  const user = useQuery(api.users.getMe);

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
            {listWithProgress.map(({ project, capturedCount, totalShots }) => (
              <li key={project._id}>
                <Link href={`/project/${project._id}`}>
                  <Card
                    className={cn(
                      "border-border bg-card transition-opacity hover:opacity-95",
                      "min-h-[44px]"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">
                            {project.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {CONTENT_TYPE_LABEL[project.contentType] ??
                              project.contentType}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
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
                      </div>
                      {totalShots > 0 && (
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${(capturedCount / totalShots) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
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
