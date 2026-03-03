"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function getTopBarConfig(pathname: string): { title: string; backHref: string | null } {
  if (pathname === "/dashboard") return { title: "My Projects", backHref: null };
  if (pathname === "/profile") return { title: "Profile", backHref: "/dashboard" };
  if (pathname === "/project/new") return { title: "New Project", backHref: "/dashboard" };
  const projectSegment = pathname.match(/^\/project\/([^/]+)/);
  if (projectSegment) {
    const id = projectSegment[1];
    if (pathname.endsWith("/capture")) return { title: "Capture", backHref: `/project/${id}` };
    if (pathname.endsWith("/report")) return { title: "Report", backHref: `/project/${id}` };
    if (pathname.endsWith("/reflect")) return { title: "Reflection", backHref: `/project/${id}` };
    return { title: "Plan", backHref: "/dashboard" };
  }
  return { title: "Shotlyst", backHref: "/dashboard" };
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { title, backHref } = getTopBarConfig(pathname);
  const isDashboard = pathname === "/dashboard";
  const isNewProject = pathname === "/project/new";
  const isProfile = pathname === "/profile";

  return (
    <div className="min-h-screen flex flex-col pb-20 bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 min-h-12 px-4">
          {backHref ? (
            <Link
              href={backHref}
              className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary min-h-[44px] min-w-[44px] -ml-2 rounded-lg hover:bg-muted pl-2 pr-2"
            >
              ← Back
            </Link>
          ) : (
            <span className="min-w-[44px]" aria-hidden />
          )}
          <h1 className="flex-1 text-center text-base font-semibold text-foreground truncate">
            {title}
          </h1>
          <span className="min-w-[44px]" aria-hidden />
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
            "flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] rounded-lg transition-colors",
            isDashboard
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
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
            "flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] rounded-lg transition-colors",
            isProfile
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Profile
        </Link>
      </nav>
    </div>
  );
}
