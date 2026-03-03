"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const hasConvex =
  typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string" &&
  process.env.NEXT_PUBLIC_CONVEX_URL.length > 0;

const CREATOR_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "growing", label: "Growing Creator" },
  { value: "experienced", label: "Experienced" },
] as const;

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
] as const;

const TRAVEL_FOCUS_OPTIONS = [
  "Cafes",
  "Food",
  "City & Nature",
  "Adventure",
  "Culture",
];

function ProfileContent() {
  const user = useQuery(api.users.getMe);
  const updateProfile = useMutation(api.users.updateProfile);
  const { signOut } = useAuthActions() ?? {};

  const handlePlatformChange = async (value: "tiktok" | "youtube" | "instagram") => {
    await updateProfile({ primaryPlatform: value });
  };

  const handleCreatorLevelChange = async (value: "beginner" | "growing" | "experienced") => {
    await updateProfile({ creatorLevel: value });
  };

  const handleTravelFocusToggle = async (option: string) => {
    const current = user?.travelFocus ?? [];
    const next = current.includes(option)
      ? current.filter((x: string) => x !== option)
      : [...current, option];
    await updateProfile({ travelFocus: next });
  };

  if (user === undefined) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl font-medium overflow-hidden">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              (user?.name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {user?.name ?? "Creator"}
            </p>
            <p className="text-sm text-muted-foreground">
              {user?.creatorLevel === "growing"
                ? "Growing Creator"
                : user?.creatorLevel === "experienced"
                  ? "Experienced"
                  : "Beginner"}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          These settings help our AI understand your account and tailor suggestions.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Primary Platform</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {PLATFORMS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePlatformChange(value)}
                className={cn(
                  "min-h-[44px] px-4 rounded-xl border-2 text-sm font-medium transition-colors",
                  user?.primaryPlatform === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creator Level</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {CREATOR_LEVELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleCreatorLevelChange(value)}
                className={cn(
                  "min-h-[44px] px-4 rounded-xl border-2 text-sm font-medium transition-colors",
                  user?.creatorLevel === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Travel Focus</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {TRAVEL_FOCUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleTravelFocusToggle(option)}
                className={cn(
                  "min-h-[44px] px-4 rounded-xl border-2 text-sm font-medium transition-colors",
                  user?.travelFocus?.includes(option)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                {option}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-1 border border-border rounded-xl overflow-hidden">
          <details className="group border-b border-border last:border-b-0">
            <summary className="flex items-center justify-between py-3 px-4 text-foreground font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              Shooting Style
            </summary>
            <div className="px-4 pb-3 text-sm text-muted-foreground">
              <p className="mb-1">These preferences will help the AI tailor capture and edit suggestions.</p>
              <p>Coming soon.</p>
            </div>
          </details>
          <details className="group border-b border-border last:border-b-0">
            <summary className="flex items-center justify-between py-3 px-4 text-foreground font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              Storage Settings
            </summary>
            <div className="px-4 pb-3 text-sm text-muted-foreground">
              <p className="mb-1">These preferences will help the AI tailor capture and edit suggestions.</p>
              <p>Coming soon.</p>
            </div>
          </details>
          <details className="group">
            <summary className="flex items-center justify-between py-3 px-4 text-foreground font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              Upload Preferences
            </summary>
            <div className="px-4 pb-3 text-sm text-muted-foreground">
              <p className="mb-1">These preferences will help the AI tailor capture and edit suggestions.</p>
              <p>Coming soon.</p>
            </div>
          </details>
        </div>

        {signOut && (
          <Button variant="outline" onClick={() => void signOut()} className="w-full">
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  if (!hasConvex) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">
          Configure Convex to view and edit your profile.
        </p>
      </div>
    );
  }
  return <ProfileContent />;
}
