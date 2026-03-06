"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

function LoginContent() {
  const searchParams = useSearchParams();
  const authActions = useAuthActions();
  const signIn = authActions?.signIn;
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const authError = searchParams.get("error");
  const showAuthErrorBanner = authError === "callback" || authError === "auth_failed";

  useEffect(() => {
    const t = setTimeout(() => setAuthReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleGoogleSignIn = async () => {
    if (!signIn || isRedirecting) return;
    setIsRedirecting(true);
    try {
      const result = await signIn("google", { redirectTo: "/dashboard" });
      if (result?.redirect) {
        window.location.href = result.redirect.toString();
        return;
      }
    } finally {
      setIsRedirecting(false);
    }
  };

  if (!signIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        {showAuthErrorBanner && (
          <div className="w-full rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Sign-in didn&apos;t complete. Check your connection and try again, or sign in with email.
          </div>
        )}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Shotlyst</h1>
          <p className="text-muted-foreground text-center text-sm">
            Create better travel videos.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Button
            type="button"
            className="w-full h-12"
            onClick={() => void handleGoogleSignIn()}
            disabled={isRedirecting || !authReady}
          >
            {isRedirecting ? "Redirecting to Google…" : "Continue with Google"}
          </Button>
          <p className="text-center text-sm text-muted-foreground py-2">Or</p>
          <Button variant="ghost" asChild>
            <Link href="/signup" className="text-primary font-medium">
              Sign up with Email
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
