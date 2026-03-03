"use client";

import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const authActions = useAuthActions();
  const signIn = authActions?.signIn;
  const [step, setStep] = useState<"signUp" | "signIn">("signUp");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("flow", step);
    try {
      const result = await signIn("password", formData);
      if (result?.signingIn) {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
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

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="w-full flex flex-col gap-4"
        >
          <Input
            name="email"
            type="email"
            placeholder="Email"
            className="h-12"
            required
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            className="h-12"
            required
            minLength={8}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full h-12">
            {step === "signUp" ? "Sign up with Email" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => setStep(step === "signUp" ? "signIn" : "signUp")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {step === "signUp"
              ? "Already have an account? Log in"
              : "Need an account? Sign up"}
          </button>
        </form>
      </div>
    </main>
  );
}
