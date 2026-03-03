"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#see-it", label: "See it" },
] as const;

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3"
        aria-label="Main"
      >
        <Link
          href="/"
          className="flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Shotlyst home"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold shadow-sm">
            S
          </div>
          <span className="hidden font-semibold text-foreground sm:inline">
            Shotlyst
          </span>
        </Link>

        {/* Desktop: center links + Sign in + Get started */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="min-h-[44px] min-w-[44px] items-center rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 inline-flex"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className="min-h-[44px] min-w-[44px] items-center rounded-xl px-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 inline-flex"
          >
            Sign in
          </Link>
          <Button asChild size="default">
            <Link href="/login">Get started</Link>
          </Button>
        </div>

        {/* Mobile: Get started + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild size="sm" className="shrink-0">
            <Link href="/login">Get started</Link>
          </Button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu (slide-down) */}
      <div
        id="mobile-menu"
        className={cn(
          "border-t border-border bg-background md:hidden",
          menuOpen ? "block" : "hidden"
        )}
        role="dialog"
        aria-label="Mobile menu"
      >
        <ul className="mx-auto max-w-6xl px-4 py-2">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[44px] min-w-full items-center rounded-xl px-4 text-sm font-medium text-foreground hover:bg-muted"
              >
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[44px] min-w-full items-center rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Sign in
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
