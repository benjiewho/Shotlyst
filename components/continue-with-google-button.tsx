"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

type ContinueWithGoogleButtonProps = {
  redirectTo?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
};

export function ContinueWithGoogleButton({
  redirectTo = "/dashboard",
  className,
  size = "lg",
  children,
}: ContinueWithGoogleButtonProps) {
  const authActions = useAuthActions();
  const signIn = authActions?.signIn;
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!signIn || isRedirecting) return;
    setIsRedirecting(true);
    try {
      const result = await signIn("google", { redirectTo });
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
      <Button className={className} size={size} asChild>
        <Link href="/login">{children ?? "Continue with Google"}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      className={className}
      size={size}
      onClick={() => void handleGoogleSignIn()}
      disabled={isRedirecting}
    >
      {isRedirecting ? "Redirecting to Google…" : (children ?? "Continue with Google")}
    </Button>
  );
}
