"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CONTENT_TYPES = [
  { value: "tiktok" as const, label: "TikTok" },
  { value: "youtube_short" as const, label: "YouTube Short" },
  { value: "travel_diary" as const, label: "Travel Diary" },
];

const AUDIENCE_OPTIONS = ["Travelers", "Locals", "Foodies", "Adventure", "Culture"];

function getVideoGoalPlaceholder(
  contentType: string,
  creatorLevel: string | undefined,
  location: string
): string {
  const loc = location.trim() || "this place";
  const ct = contentType === "tiktok" ? "TikTok" : contentType === "youtube_short" ? "YouTube Short" : "Travel Diary";
  if (creatorLevel === "beginner" || !creatorLevel) {
    if (contentType === "tiktok") return `e.g. Show the vibe of ${loc} in 15 seconds for travelers.`;
    if (contentType === "youtube_short") return `e.g. A quick tour of ${loc} that hooks viewers in the first 3 seconds.`;
    return `e.g. Capture the feel of ${loc} in a short diary-style clip.`;
  }
  if (creatorLevel === "experienced") {
    if (contentType === "travel_diary") return `e.g. Tell a short story that makes viewers want to visit ${loc}.`;
    return `e.g. Create a punchy ${ct} that drives saves and shares.`;
  }
  return `e.g. What do you want this ${ct} to achieve? Who is it for?`;
}

export default function NewProjectPage() {
  const router = useRouter();
  const user = useQuery(api.users.getMe);
  const createProject = useMutation(api.projects.create);
  const generatePlan = useAction(api.ai.generatePlan);
  const suggestVideoGoal = useAction(api.ai.suggestVideoGoal);

  const [location, setLocation] = useState("");
  const [contentType, setContentType] = useState<"tiktok" | "youtube_short" | "travel_diary">("tiktok");
  const [videoGoal, setVideoGoal] = useState("");
  const [audience, setAudience] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleAudience = (option: string) => {
    setAudience((prev) =>
      prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option]
    );
  };

  const videoGoalPlaceholder = getVideoGoalPlaceholder(
    contentType,
    user?.creatorLevel,
    location
  );

  const handleGetAIIdeas = async () => {
    setError(null);
    setIsSuggesting(true);
    try {
      const { suggestions } = await suggestVideoGoal({
        location: location.trim(),
        contentType,
        audience,
        creatorLevel: user?.creatorLevel,
        travelFocus: user?.travelFocus,
      });
      if (suggestions.length > 0) setVideoGoal(suggestions[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get suggestions.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const isProfileIncomplete =
    !user?.creatorLevel || !user?.primaryPlatform;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedLocation = location.trim();
    const trimmedGoal = videoGoal.trim();
    if (!trimmedLocation) {
      setError("Location is required.");
      return;
    }
    if (!trimmedGoal) {
      setError("Video goal is required.");
      return;
    }
    if (audience.length === 0) {
      setError("Select at least one audience.");
      return;
    }
    setIsSubmitting(true);
    try {
      const name = trimmedLocation.length > 30 ? trimmedLocation.slice(0, 30) : trimmedLocation;
      const projectId = await createProject({
        name,
        location: trimmedLocation,
        contentType,
        videoGoal: trimmedGoal,
        audience,
      });
      await generatePlan({ projectId });
      router.push(`/project/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="location" className="text-sm font-medium text-foreground block mb-1.5">
                Location
              </label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Cafe Onion — Seongsu"
                className="w-full"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="contentType" className="text-sm font-medium text-foreground block mb-1.5">
                Content type
              </label>
              <select
                id="contentType"
                value={contentType}
                onChange={(e) =>
                  setContentType(e.target.value as "tiktok" | "youtube_short" | "travel_diary")
                }
                disabled={isSubmitting}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {CONTENT_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="videoGoal" className="text-sm font-medium text-foreground block mb-1.5">
                Video goal
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">
                Describe what you want this video to achieve. Use &quot;Get AI ideas&quot; if you&apos;re not sure.
              </p>
              <textarea
                id="videoGoal"
                value={videoGoal}
                onChange={(e) => setVideoGoal(e.target.value)}
                placeholder={videoGoalPlaceholder}
                rows={4}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[88px]"
                disabled={isSubmitting}
              />
              {isProfileIncomplete && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Set up your <Link href="/profile" className="underline">profile</Link> so we can tailor suggestions.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleGetAIIdeas}
                disabled={isSubmitting || isSuggesting}
              >
                {isSuggesting ? "Getting ideas…" : "Get AI ideas"}
              </Button>
            </div>
            <div>
              <span className="text-sm font-medium text-foreground block mb-1.5">
                Audience <span className="text-muted-foreground font-normal">(select at least one)</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleAudience(option)}
                    disabled={isSubmitting}
                    className={cn(
                      "min-h-11 rounded-xl px-4 text-sm font-medium border transition-colors",
                      audience.includes(option)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            className="flex-1 min-h-12"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating project & generating plan…" : "Create project"}
          </Button>
          <Button type="button" variant="outline" size="lg" asChild disabled={isSubmitting}>
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
