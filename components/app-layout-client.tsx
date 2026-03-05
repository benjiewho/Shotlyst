"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TopBarConfig = {
  title: string;
  backHref: string | null;
  projectId?: string;
  segment?: string;
};

function getTopBarConfig(pathname: string): TopBarConfig {
  if (pathname === "/dashboard") return { title: "My Projects", backHref: null };
  if (pathname === "/profile") return { title: "Profile", backHref: "/dashboard" };
  if (pathname === "/library") return { title: "Library", backHref: "/dashboard" };
  if (pathname === "/project/new") return { title: "New Project", backHref: "/dashboard" };
  const projectMatch = pathname.match(/^\/project\/([^/]+)/);
  if (projectMatch) {
    const id = projectMatch[1];
    if (pathname.endsWith("/capture")) return { title: "Capture", backHref: `/project/${id}`, projectId: id, segment: "Capture" };
    if (pathname.endsWith("/report")) return { title: "Report", backHref: `/project/${id}`, projectId: id, segment: "Report" };
    if (pathname.endsWith("/reflect")) return { title: "Reflection", backHref: `/project/${id}`, projectId: id, segment: "Reflection" };
    return { title: "Plan", backHref: "/dashboard", projectId: id, segment: "Plan" };
  }
  return { title: "Shotlyst", backHref: "/dashboard" };
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { title, backHref, projectId, segment } = getTopBarConfig(pathname);
  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId as Id<"projects"> } : "skip"
  );
  const headerTitle =
    projectId && segment
      ? project
        ? `${project.name} > ${segment}`
        : segment
      : title;
  const isDashboard = pathname === "/dashboard";
  const isNewProject = pathname === "/project/new";
  const isLibrary = pathname === "/library";
  const isProfile = pathname === "/profile";
  const { signOut } = useAuthActions() ?? {};

  return (
    <div className="min-h-screen flex flex-col pb-20 bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
        <div className="flex items-center min-h-11 gap-1 px-3 sm:px-4">
          <div className="w-10 shrink-0 flex items-center justify-start">
            {backHref ? (
              <Link
                href={backHref}
                className="flex items-center min-h-11 min-w-10 pl-1 pr-2 -ml-1 rounded-lg hover:bg-muted/80 active:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Go back"
              >
                ←
              </Link>
            ) : (
              <span className="w-10" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-center">
            {!isLibrary && (backHref ? (
              <span className="text-sm font-medium text-foreground truncate block w-full text-center">
                {headerTitle}
              </span>
            ) : (
              <h1 className="text-base font-semibold text-foreground truncate w-full text-center px-2">
                {headerTitle}
              </h1>
            ))}
          </div>
          <div className="shrink-0 flex items-center justify-end gap-1">
            {!isLibrary && (
              <Link
                href="/library"
                className="min-h-11 px-2 rounded-lg flex items-center text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                Library
              </Link>
            )}
            {isProfile && signOut && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-9 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => void signOut()}
              >
                Sign out
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-background flex items-center justify-around h-16 z-50 pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] rounded-xl px-3 transition-colors",
            isDashboard
              ? "bg-primary/15 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Dashboard
        </Link>
        <Link
          href="/project/new"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl px-6 py-2 min-h-[44px] font-medium transition-colors",
            isNewProject
              ? "bg-primary text-primary-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          New Project
        </Link>
        <Link
          href="/profile"
          className={cn(
            "flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] rounded-xl px-3 transition-colors",
            isProfile
              ? "bg-primary/15 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Profile
        </Link>
      </nav>
    </div>
  );
}
