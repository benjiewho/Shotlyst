"use client";

import { type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ShotForCapture } from "./useShotCapture";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type ShotCapturePanelProps = {
  mode: "pre" | "post" | "assigned";
  shot: ShotForCapture | null;
  recordedBlobUrl: string | null;
  isUploading: boolean;
  uploadProgress: number | null;
  error: string | null;
  canAssign: boolean;
  onRetake: () => void;
  onAssign: () => void;
  nativeCameraInputRef: RefObject<HTMLInputElement>;
  onOpenCamera: () => void;
  onCameraFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenGallery: () => void;
  sceneUrl: string | null | undefined;
  onReplace: () => void;
  onUnassign: () => void;
  strongMoments: { timestampSeconds: number; reason: string }[] | null | undefined;
  sceneFeedback: ShotForCapture["sceneFeedback"];
  revealedFeedback: boolean;
  onRevealFeedback: () => void;
  reviewVideoRef: RefObject<HTMLVideoElement>;
  assignedVideoInLibrary?: boolean;
  /** Optional: show compact layout (e.g. inside plan card) */
  compact?: boolean;
  /** When true, do not show "Open the camera to record this shot." */
  hideInstructionText?: boolean;
  /** Label for the primary (camera) button, e.g. "Add video" instead of "Open camera" */
  primaryButtonLabel?: string;
};

export function ShotCapturePanel({
  mode,
  shot,
  recordedBlobUrl,
  isUploading,
  uploadProgress,
  error,
  canAssign,
  onRetake,
  onAssign,
  nativeCameraInputRef,
  onOpenCamera,
  onCameraFileChange,
  onOpenGallery,
  sceneUrl,
  onReplace,
  onUnassign,
  strongMoments,
  sceneFeedback,
  revealedFeedback,
  onRevealFeedback,
  reviewVideoRef,
  assignedVideoInLibrary,
  compact,
  hideInstructionText,
  primaryButtonLabel = "Open camera",
}: ShotCapturePanelProps) {
  if (!shot) return null;

  if (mode === "pre") {
    return (
      <Card className={cn(compact && "border-0 shadow-none bg-muted/30")}>
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex flex-col items-center justify-start gap-4 w-full">
            {!hideInstructionText && (
              <p className="text-sm text-muted-foreground text-center">
                Open the camera to record this shot.
              </p>
            )}
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              aria-label="Record video"
              onChange={onCameraFileChange}
            />
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs justify-center">
              <Button
                type="button"
                size={compact ? "default" : "lg"}
                className="min-h-11 min-h-[44px]"
                onClick={onOpenCamera}
              >
                {primaryButtonLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                size={compact ? "default" : "lg"}
                className="min-h-11 min-h-[44px]"
                onClick={onOpenGallery}
                aria-label="Choose video from gallery"
              >
                Gallery
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === "post") {
    return (
      <Card className={cn(compact && "border-0 shadow-none bg-muted/30")}>
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex flex-1 flex-col items-center gap-4 w-full min-h-0 min-w-0">
            <div className="w-full flex items-center justify-center flex-shrink-0 min-h-0 max-h-[45vh] min-h-[160px] overflow-hidden rounded-lg">
              {recordedBlobUrl && (
                <video
                  key={recordedBlobUrl}
                  src={recordedBlobUrl}
                  controls
                  playsInline
                  className="max-w-full max-h-full w-full h-full object-contain rounded-lg bg-black"
                />
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {isUploading && (
              <div className="w-full space-y-1">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{
                      width: uploadProgress != null ? `${uploadProgress}%` : "100%",
                      animation:
                        uploadProgress == null ? "pulse 1.5s ease-in-out infinite" : undefined,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {uploadProgress != null ? `Uploading… ${uploadProgress}%` : "Uploading…"}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full flex-wrap flex-shrink-0">
              <Button
                variant="outline"
                className="flex-1 min-h-11 min-w-0 text-sm whitespace-normal break-words min-h-[44px]"
                onClick={onRetake}
                disabled={isUploading}
              >
                Retake
              </Button>
              <Button
                className="flex-1 min-h-11 min-w-0 text-sm whitespace-normal break-words min-h-[44px]"
                onClick={onAssign}
                disabled={isUploading || !canAssign}
              >
                {isUploading ? "Uploading…" : canAssign ? "Assign Video" : "Saving…"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // mode === "assigned"
  return (
    <Card className={cn(compact && "border-0 shadow-none bg-muted/30")}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex flex-1 flex-col items-center gap-4 w-full min-h-0 min-w-0">
          {sceneUrl ? (
            <div
              className="w-full flex items-center justify-center flex-shrink-0"
              style={{ minHeight: "min(40vh, 280px)" }}
            >
              <video
                ref={reviewVideoRef}
                src={sceneUrl}
                controls
                playsInline
                autoPlay
                loop
                muted
                className="max-w-full max-h-full w-full h-full object-contain rounded-lg bg-black"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-4">Video unavailable</p>
          )}
          {assignedVideoInLibrary && (
            <p className="text-xs text-primary font-medium flex-shrink-0">Saved to library</p>
          )}
          <div className="flex flex-wrap gap-2 w-full justify-center">
            <Button variant="outline" size="sm" onClick={onReplace}>
              Replace
            </Button>
            <Button variant="outline" size="sm" onClick={onUnassign}>
              Unassign
            </Button>
          </div>
          <div className="w-full space-y-2 flex-shrink-0 min-h-0">
            <p className="text-sm font-medium text-foreground">Strong moments</p>
            {strongMoments && strongMoments.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {strongMoments.map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-primary font-medium hover:underline"
                      onClick={() => {
                        if (reviewVideoRef.current)
                          reviewVideoRef.current.currentTime = m.timestampSeconds;
                      }}
                    >
                      {formatDuration(m.timestampSeconds)}
                    </button>
                    <span className="text-muted-foreground">{m.reason}</span>
                  </li>
                ))}
              </ul>
            ) : shot.sceneStorageId ? (
              <p className="text-xs text-muted-foreground">Analyzing… video</p>
            ) : null}
          </div>
          <div className="w-full space-y-2 flex-shrink-0 min-h-0">
            <p className="text-sm font-medium text-foreground">Video Scene feedback</p>
            {revealedFeedback && sceneFeedback ? (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{sceneFeedback.alignmentSummary}</p>
                {sceneFeedback.pros.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground mb-1">Pros</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {sceneFeedback.pros.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {sceneFeedback.cons.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground mb-1">Cons</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {sceneFeedback.cons.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : sceneFeedback ? (
              <Button type="button" variant="outline" size="sm" onClick={onRevealFeedback}>
                Get AI Feedback
              </Button>
            ) : shot.sceneStorageId ? (
              <p className="text-xs text-muted-foreground">Analyzing… video</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Run analysis above to see alignment and feedback.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
