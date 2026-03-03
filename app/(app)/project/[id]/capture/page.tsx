"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SHOT_EXPLANATIONS: Record<string, string> = {
  hook_shot:
    "Grab attention in the first 1–2 seconds: bold visual, question, or movement.",
  establishing_shot:
    "Wide shot that sets the scene; show where you are and the vibe.",
  action_shots:
    "Show movement and energy; keep the camera steady or use intentional motion.",
  detail_broll:
    "Close-ups and cutaways: food, hands, details that support the story.",
};

function getShotExplanation(shotCategory: string | undefined, title: string): string {
  if (shotCategory && SHOT_EXPLANATIONS[shotCategory])
    return SHOT_EXPLANATIONS[shotCategory];
  const t = title.toLowerCase();
  if (t.includes("hook")) return SHOT_EXPLANATIONS.hook_shot;
  if (t.includes("establish") || t.includes("wide")) return SHOT_EXPLANATIONS.establishing_shot;
  if (t.includes("action") || t.includes("reaction") || t.includes("moment"))
    return SHOT_EXPLANATIONS.action_shots;
  if (t.includes("detail") || t.includes("b-roll") || t.includes("product"))
    return SHOT_EXPLANATIONS.detail_broll;
  return "Capture what fits the shot description. Keep it steady and intentional.";
}

export default function CapturePage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const projectId = id as Id<"projects"> | undefined;

  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId } : "skip"
  );
  const shots = useQuery(
    api.shots.listByProject,
    projectId ? { projectId } : "skip"
  );

  const generateUploadUrl = useMutation(api.shots.generateUploadUrl);
  const linkScene = useMutation(api.shots.linkScene);
  const updateStatus = useMutation(api.shots.updateStatus);
  const updateShot = useMutation(api.shots.updateShot);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [selectedShotId, setSelectedShotId] = useState<Id<"shots"> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipFeedback, setSkipFeedback] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);

  const pendingShots = useMemo(
    () => shots?.filter((s) => s.status === "pending") ?? [],
    [shots]
  );
  const selectedShot = shots?.find((s) => s._id === selectedShotId) ?? null;
  const currentShot =
    selectedShot?.status === "pending" ? selectedShot : pendingShots[0] ?? null;
  const capturedCount = shots?.filter((s) => s.status === "captured").length ?? 0;
  const totalShots = shots?.length ?? 0;
  const allCaptured = totalShots > 0 && capturedCount === totalShots;
  const firstPendingByOrder = pendingShots[0] ?? null;

  useEffect(() => {
    if (!shots?.length || selectedShotId !== null) return;
    const pending = shots.filter((s) => s.status === "pending");
    if (pending.length > 0) setSelectedShotId(pending[0]._id);
  }, [shots, selectedShotId]);

  useEffect(() => {
    if (!cameraOpen || !stream) return;
    const video = videoRef.current;
    if (video) video.srcObject = stream;
    return () => {
      if (video) video.srcObject = null;
    };
  }, [cameraOpen, stream]);

  const openCamera = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setStream(mediaStream);
      setCameraOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not access camera.");
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraOpen(false);
    setRecording(false);
    setRecordedBlob(null);
    setRecordedDuration(0);
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [stream]);

  const startRecording = useCallback(() => {
    if (!stream || !videoRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
      videoBitsPerSecond: 2500000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      setRecordedBlob(blob);
      setRecordedDuration((Date.now() - recordingStartRef.current) / 1000);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(200);
    recordingStartRef.current = Date.now();
    setRecording(true);
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const confirmCapture = useCallback(async () => {
    if (!currentShot || !recordedBlob) return;
    if (isUploading) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const contentType =
        recordedBlob.type.split(";")[0].trim() || "video/webm";
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: recordedBlob,
      });
      if (!result.ok) {
        const body = await result.text();
        const msg = body ? `${result.status}: ${body}` : `Upload failed (${result.status})`;
        if (process.env.NODE_ENV === "development") console.error("Upload error", result.status, body);
        throw new Error(msg);
      }
      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
      await linkScene({
        shotId: currentShot._id,
        storageId,
        duration: Math.round(recordedDuration),
      });
      setRecordedBlob(null);
      setRecordedDuration(0);
      const remaining = pendingShots.filter((s) => s._id !== currentShot._id);
      setSelectedShotId(remaining.length > 0 ? remaining[0]._id : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }, [currentShot, recordedBlob, recordedDuration, generateUploadUrl, linkScene, pendingShots, isUploading]);

  const retake = useCallback(() => {
    setRecordedBlob(null);
    setRecordedDuration(0);
  }, []);

  const skipShot = useCallback(async () => {
    if (!currentShot) return;
    setError(null);
    setSkipFeedback(null);
    try {
      await updateStatus({ shotId: currentShot._id, status: "skipped" });
      const remaining = pendingShots.filter((s) => s._id !== currentShot._id);
      const nextShot = remaining.length > 0 ? remaining[0] : null;
      setSelectedShotId(nextShot?._id ?? null);
      setRecordedBlob(null);
      if (nextShot) {
        setSkipFeedback(`Skipped — now on: ${nextShot.title}`);
        setTimeout(() => setSkipFeedback(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not skip.");
    }
  }, [currentShot, updateStatus, pendingShots]);

  if (!projectId) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Invalid project.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (project === undefined || shots === undefined) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Project not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <div className="mb-4 space-y-1">
        {currentShot && (
          <div>
            <button
              type="button"
              onClick={() => setShowExplanation((v) => !v)}
              aria-label="Show shot type tips"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground text-left underline decoration-dashed underline-offset-2 hover:no-underline"
            >
              <span className="truncate">Current: {currentShot.title}</span>
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            {showExplanation && (
              <p className="mt-2 text-xs text-muted-foreground rounded-lg bg-muted/60 px-3 py-2">
                {getShotExplanation(currentShot.shotCategory, currentShot.title)}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {capturedCount} of {totalShots} shots captured
          </span>
          {allCaptured ? (
            <span className="text-muted-foreground font-medium text-primary">
              Project complete
            </span>
          ) : firstPendingByOrder ? (
            <span className="text-muted-foreground truncate max-w-[50%]">
              Next: {firstPendingByOrder.title}
            </span>
          ) : null}
        </div>
      </div>

      {skipFeedback && (
        <p className="mb-4 text-sm text-primary font-medium rounded-lg bg-primary/10 px-3 py-2">
          {skipFeedback}
        </p>
      )}

      {error && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      {/* Camera / preview area */}
      <Card className="mb-6 overflow-hidden bg-muted/50">
        <CardContent className="relative p-0 aspect-[9/16] max-h-[60vh] flex flex-col items-center justify-center">
          {!cameraOpen ? (
            <div className="flex flex-col items-center gap-4 p-6">
              <p className="text-sm text-muted-foreground text-center">
                Open the camera to record this shot.
              </p>
              <Button
                type="button"
                size="lg"
                className="min-h-12"
                onClick={openCamera}
                disabled={!currentShot}
              >
                Open camera
              </Button>
            </div>
          ) : (
            <>
              {!recordedBlob ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {!recording ? (
                      <Button
                        size="lg"
                        className="min-h-12 rounded-full w-14 h-14 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg ring-2 ring-background/80"
                        onClick={startRecording}
                      >
                        Record
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="min-h-12 rounded-full w-14 h-14 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg ring-2 ring-background/80"
                        onClick={stopRecording}
                      >
                        Stop
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 p-4 w-full">
                  <video
                    src={URL.createObjectURL(recordedBlob)}
                    controls
                    playsInline
                    className="w-full max-h-[50vh] rounded-lg bg-black"
                  />
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1 min-h-11"
                      onClick={retake}
                      disabled={isUploading}
                    >
                      Retake
                    </Button>
                    <Button
                      className="flex-1 min-h-11"
                      onClick={confirmCapture}
                      disabled={isUploading}
                    >
                      {isUploading ? "Uploading…" : "Confirm"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {cameraOpen && !recordedBlob && currentShot && (
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            className="flex-1 min-h-11"
            onClick={skipShot}
            disabled={recording}
          >
            Skip shot
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={closeCamera}
          >
            Close camera
          </Button>
        </div>
      )}

      {/* Per-shot notes for current shot */}
      {currentShot && (
        <Card key={currentShot._id} className="mb-4">
          <CardContent className="p-4">
            <label className="text-sm font-medium text-foreground block mb-2">
              Notes &amp; reminders
            </label>
            <textarea
              defaultValue={currentShot.sceneNotes ?? ""}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== (currentShot.sceneNotes ?? ""))
                  updateShot({ shotId: currentShot._id, sceneNotes: v });
              }}
              placeholder="What to do, what you did, or reminders for this scene…"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-y"
            />
          </CardContent>
        </Card>
      )}

      {/* Shot list — click to select which shot to capture */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-medium text-foreground mb-3">Shot list</h2>
          <p className="text-xs text-muted-foreground mb-2">Tap a shot to capture or upload for it.</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {shots.map((shot) => (
              <li key={shot._id}>
                <button
                  type="button"
                  onClick={() => setSelectedShotId(shot._id)}
                  className={cn(
                    "w-full flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg text-left transition-colors",
                    shot.status === "captured" && "bg-primary/10 text-muted-foreground",
                    shot.status === "skipped" && "opacity-60 text-muted-foreground",
                    shot.status === "pending" && selectedShotId === shot._id && "bg-primary/20 font-medium",
                    "hover:bg-muted/80"
                  )}
                >
                  {shot.status === "captured" ? (
                    <span className="text-primary shrink-0">✓</span>
                  ) : shot.status === "skipped" ? (
                    <span className="shrink-0">−</span>
                  ) : (
                    <span className="w-5 h-5 shrink-0 rounded-full border-2 border-primary flex items-center justify-center text-xs">
                      {shot.order + 1}
                    </span>
                  )}
                  <span className="truncate min-w-0">{shot.title}</span>
                  {shot.status === "captured" && shot.sceneDuration != null && (
                    <span className="shrink-0 text-xs text-muted-foreground ml-1">
                      {formatDuration(shot.sceneDuration)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="flex-1 min-h-11" asChild>
          <Link href={`/project/${project._id}/report`}>View report</Link>
        </Button>
        <Button className="flex-1 min-h-11" asChild>
          <Link href={`/project/${project._id}`}>Back to plan</Link>
        </Button>
      </div>
    </div>
  );
}
