"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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

const STORY_FORMATS = [
  { value: "discovery", label: "Discovery" },
  { value: "review", label: "Review" },
  { value: "hidden_gem", label: "Hidden Gem" },
  { value: "what_i_ordered", label: "What I Ordered / Tried" },
  { value: "vibe_atmosphere", label: "Vibe / Atmosphere" },
  { value: "quick_recommendation", label: "Quick Recommendation" },
] as const;

const STORY_FORMAT_TO_GOAL: Record<string, string> = {
  discovery: "Show what this place is like and why it stands out.",
  review: "Review this place and help viewers decide if it's worth visiting.",
  hidden_gem: "Show why this place feels like a hidden gem.",
  what_i_ordered: "Show what I ordered/tried and the experience.",
  vibe_atmosphere: "Capture the vibe and atmosphere of this place.",
  quick_recommendation: "Give a quick visual recommendation of this place.",
};

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useMutation(api.projects.create);
  const generatePlan = useAction(api.ai.generatePlan);
  const generateUploadUrl = useMutation(api.shots.generateUploadUrl);
  const locationPhotoInputRef = useRef<HTMLInputElement>(null);

  const [location, setLocation] = useState("");
  const [contentType, setContentType] = useState<"tiktok" | "youtube_short" | "travel_diary">("tiktok");
  const [storyFormat, setStoryFormat] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [customGoalExpanded, setCustomGoalExpanded] = useState(false);
  const [audience, setAudience] = useState<string[]>([]);
  const [locationImageStorageId, setLocationImageStorageId] = useState<Id<"_storage"> | null>(null);
  const [locationImagePreviewUrl, setLocationImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitPhase, setSubmitPhase] = useState<"creating" | "generating">("creating");
  const [error, setError] = useState<string | null>(null);

  const toggleAudience = (option: string) => {
    setAudience((prev) =>
      prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option]
    );
  };

  const handleLocationPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (locationImagePreviewUrl) URL.revokeObjectURL(locationImagePreviewUrl);
    setLocationImagePreviewUrl(null);
    setLocationImageStorageId(null);
    setIsUploadingImage(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const storageId = await new Promise<Id<"_storage">>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as { storageId: Id<"_storage"> };
              resolve(data.storageId);
            } catch {
              reject(new Error("Invalid upload response"));
            }
          } else {
            reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      setLocationImageStorageId(storageId);
      setLocationImagePreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeLocationPhoto = () => {
    if (locationImagePreviewUrl) URL.revokeObjectURL(locationImagePreviewUrl);
    setLocationImagePreviewUrl(null);
    setLocationImageStorageId(null);
  };

  const effectiveVideoGoal =
    customGoal.trim() || (storyFormat ? STORY_FORMAT_TO_GOAL[storyFormat] ?? "" : "") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      setError("Location is required.");
      return;
    }
    if (!effectiveVideoGoal) {
      setError("Pick a story format or add a custom goal.");
      return;
    }
    setIsSubmitting(true);
    setSubmitPhase("creating");
    setSubmitProgress(15);
    try {
      const name = trimmedLocation.length > 30 ? trimmedLocation.slice(0, 30) : trimmedLocation;
      const projectId = await createProject({
        name,
        location: trimmedLocation,
        contentType,
        videoGoal: effectiveVideoGoal,
        audience,
        ...(locationImageStorageId ? { locationImageStorageId } : {}),
      });
      setSubmitProgress(50);
      setSubmitPhase("generating");
      await generatePlan({ projectId });
      setSubmitProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      router.push(`/project/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
      setSubmitProgress(0);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="location" className="text-sm font-medium text-foreground block mb-1.5">
                  Location
                </label>
                <p className="text-xs text-muted-foreground mb-1.5">Where do you plan to film?</p>
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
                <span className="text-sm font-medium text-foreground block mb-0.5">
                  Add a photo of this place <span className="text-muted-foreground font-normal">(optional)</span>
                </span>
                <p className="text-xs text-muted-foreground mb-1.5">Helps the AI suggest shots for your location.</p>
                <input
                  ref={locationPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  aria-label="Take or choose a location photo"
                  onChange={handleLocationPhotoChange}
                  disabled={isSubmitting || isUploadingImage}
                />
              {locationImageStorageId && locationImagePreviewUrl ? (
                <div className="flex flex-col gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview is a blob/object URL */}
                  <img
                    src={locationImagePreviewUrl}
                    alt="Location"
                    className="w-full max-w-xs aspect-video object-cover rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeLocationPhoto}
                    disabled={isSubmitting}
                  >
                    Remove photo
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => locationPhotoInputRef.current?.click()}
                  disabled={isSubmitting || isUploadingImage}
                >
                  {isUploadingImage ? "Uploading…" : "Take a photo"}
                </Button>
              )}
              </div>
            </div>
            <div>
              <label htmlFor="contentType" className="text-sm font-medium text-foreground block mb-1.5">
                Content type
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Where you plan to share.</p>
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
              <span className="text-sm font-medium text-foreground block mb-0.5">Story format</span>
              <p className="text-xs text-muted-foreground mb-1.5">Pick a direction for your video.</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Story format">
                {STORY_FORMATS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStoryFormat(value)}
                    disabled={isSubmitting}
                    className={cn(
                      "min-h-11 rounded-xl px-4 text-sm font-medium border transition-colors",
                      storyFormat === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-foreground block mb-1.5">
                Audience <span className="text-muted-foreground font-normal">(optional)</span>
              </span>
              <p className="text-xs text-muted-foreground mb-1.5">Who&apos;s it for? Optional.</p>
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
            <div>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                onClick={() => setCustomGoalExpanded((v) => !v)}
                disabled={isSubmitting}
                aria-expanded={customGoalExpanded}
              >
                {customGoalExpanded ? "Hide custom goal" : "Add custom goal (optional)"}
              </button>
              {customGoalExpanded && (
                <div className="mt-2">
                  <label htmlFor="customGoal" className="sr-only">
                    Custom video goal
                  </label>
                  <textarea
                    id="customGoal"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder="e.g. Your own take on this video…"
                    rows={3}
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[72px]"
                    disabled={isSubmitting}
                  />
                </div>
              )}
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
            {isSubmitting ? (submitPhase === "creating" ? "Creating project…" : "Generating plan…") : "Create project"}
          </Button>
          <Button type="button" variant="outline" size="lg" asChild disabled={isSubmitting}>
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
        {isSubmitting && (
          <div className="mt-3 space-y-1.5">
            <p className="text-sm text-muted-foreground">
              {submitPhase === "creating" ? "Creating project…" : "Generating plan…"} {submitProgress}%
            </p>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${submitProgress}%` }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
