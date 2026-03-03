"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const authActions = useAuthActions();
  const signIn = authActions?.signIn;
  const [isRedirecting, setIsRedirecting] = useState(false);

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
            disabled={isRedirecting}
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
