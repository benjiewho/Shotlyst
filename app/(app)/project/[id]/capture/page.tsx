"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Info, Maximize2, Minimize2, ChevronDown, ChevronUp } from "lucide-react";
import { ReplaceVideoModal } from "@/components/replace-video-modal";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SHOT_CATEGORY_LABELS: Record<string, string> = {
  hook_shot: "Hook shot",
  establishing_shot: "Establishing shot",
  action_shots: "Action shots",
  detail_broll: "Detail/B-roll",
};

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
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const unassignShot = useMutation(api.shots.unassignShot);
  const saveToLibrary = useMutation(api.media.saveToLibrary);
  const updateStatus = useMutation(api.shots.updateStatus);
  const updateShot = useMutation(api.shots.updateShot);
  const analyzeStrongMoments = useAction(api.ai.analyzeVideoForStrongMoments);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [selectedShotId, setSelectedShotId] = useState<Id<"shots"> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [analyzingShotId, setAnalyzingShotId] = useState<Id<"shots"> | null>(null);
  const [streamAspect, setStreamAspect] = useState<{ w: number; h: number } | null>(null);
  const [previewAspect, setPreviewAspect] = useState<{ w: number; h: number } | null>(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [savedToLibraryFeedback, setSavedToLibraryFeedback] = useState(false);
  const [revealedFeedbackShotId, setRevealedFeedbackShotId] = useState<Id<"shots"> | null>(null);
  const [shotListExpanded, setShotListExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraWrapperRef = useRef<HTMLDivElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const hasSetInitialSelectionRef = useRef(false);
  const prevSelectedShotIdRef = useRef<Id<"shots"> | null>(null);

  const pendingShots = useMemo(
    () => shots?.filter((s) => s.status === "pending") ?? [],
    [shots]
  );
  const selectedShot = shots?.find((s) => s._id === selectedShotId) ?? null;
  const currentShot = selectedShot ?? pendingShots[0] ?? null;
  const sceneUrl = useQuery(
    api.shots.getSceneUrl,
    selectedShot?.status === "captured" && selectedShot?.sceneStorageId
      ? { storageId: selectedShot.sceneStorageId }
      : "skip"
  );
  const projectMedia = useQuery(
    api.media.listByProject,
    projectId ? { projectId } : "skip"
  );
  const shotIdsWithLibraryMedia = useMemo(
    () => new Set((projectMedia ?? []).map((m) => m.shotId)),
    [projectMedia]
  );
  const mediaForShot = useQuery(
    api.media.listByShot,
    selectedShot?.status === "captured" && selectedShot?._id
      ? { shotId: selectedShot._id }
      : "skip"
  );
  const assignedVideoInLibrary =
    !!selectedShot?.sceneStorageId &&
    !!mediaForShot?.some((m) => m.storageId === selectedShot.sceneStorageId);
  const capturedCount = shots?.filter((s) => s.status === "captured").length ?? 0;
  const totalShots = shots?.length ?? 0;
  const allCaptured = totalShots > 0 && capturedCount === totalShots;
  const nextPendingAfterSelected = useMemo(() => {
    if (!shots?.length) return null;
    const sorted = [...shots].sort((a, b) => a.order - b.order);
    if (!selectedShot) return sorted.find((s) => s.status !== "captured") ?? null;
    return sorted.find((s) => s.order > selectedShot.order && s.status !== "captured") ?? null;
  }, [shots, selectedShot]);

  const cardAspect = cameraOpen ? streamAspect : null;
  const cardContentStyle = cardAspect
    ? { aspectRatio: cardAspect.w / cardAspect.h }
    : undefined;

  useEffect(() => {
    if (!projectId || !shots?.length) {
      hasSetInitialSelectionRef.current = false;
      return;
    }
    if (hasSetInitialSelectionRef.current) return;
    const shotParam = searchParams.get("shot");
    const paramId = shotParam as Id<"shots"> | null;
    if (paramId && shots.some((s) => s._id === paramId)) {
      setSelectedShotId(paramId);
    } else {
      setSelectedShotId(shots[0]._id);
    }
    hasSetInitialSelectionRef.current = true;
  }, [projectId, shots, searchParams]);

  useEffect(() => {
    const prev = prevSelectedShotIdRef.current;
    prevSelectedShotIdRef.current = selectedShotId;
    if (prev !== null && prev !== selectedShotId) {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      setCameraOpen(false);
      setRecording(false);
      setRecordedBlob(null);
      setRecordedDuration(0);
      setStreamAspect(null);
      setPreviewAspect(null);
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
        setRecordedBlobUrl(null);
      }
      mediaRecorderRef.current = null;
      chunksRef.current = [];
    }
  }, [selectedShotId, stream, recordedBlobUrl]);

  useEffect(() => {
    if (!cameraOpen || !stream) return;
    const video = videoRef.current;
    if (video) video.srcObject = stream;
    return () => {
      if (video) video.srcObject = null;
    };
  }, [cameraOpen, stream]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!recordedBlob && !(selectedShot?.status === "captured" && selectedShot?.sceneStorageId && sceneUrl)) {
      setPreviewAspect(null);
    }
  }, [recordedBlob, selectedShot?.status, selectedShot?.sceneStorageId, sceneUrl]);

  useEffect(() => {
    if (!recordedBlob) {
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
        setRecordedBlobUrl(null);
      }
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    setRecordedBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setRecordedBlobUrl(null);
    };
  // recordedBlobUrl is read only in the cleanup path when recordedBlob is cleared; including it in deps would re-run when we set it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedBlob]);

  const openCamera = useCallback(async () => {
    setError(null);
    setStreamAspect(null);
    try {
      const isPortrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          ...(isPortrait
            ? { width: { ideal: 720 }, height: { ideal: 1280 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } }),
        },
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
    setStreamAspect(null);
    setPreviewAspect(null);
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [stream]);

  const stopStreamOnly = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraOpen(false);
    setStreamAspect(null);
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
    stopStreamOnly();
  }, [stopStreamOnly]);

  const confirmCapture = useCallback(async () => {
    if (!currentShot || !recordedBlob) return;
    if (isUploading) return;
    // Redirect to report only when this upload completes the last shot (all shots will be captured).
    const willCompleteAllShots = totalShots > 0 && capturedCount + 1 === totalShots;
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const contentType =
        recordedBlob.type.split(";")[0].trim() || "video/webm";
      const storageId = await new Promise<Id<"_storage">>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as { storageId: Id<"_storage"> };
              resolve(data.storageId);
            } catch {
              reject(new Error("Invalid upload response"));
            }
          } else {
            reject(new Error(xhr.responseText ? `${xhr.status}: ${xhr.responseText}` : `Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(recordedBlob);
      });
      // Save to library first, then assign to scene (so unassign only clears assignment; video stays in library).
      await saveToLibrary({
        projectId: projectId!,
        shotId: currentShot._id,
        storageId,
        duration: Math.round(recordedDuration),
      });
      await linkScene({
        shotId: currentShot._id,
        storageId,
        duration: Math.round(recordedDuration),
      });
      analyzeStrongMoments({ shotId: currentShot._id }).catch(() => {});
      setRecordedBlob(null);
      setRecordedDuration(0);
      const remaining = pendingShots.filter((s) => s._id !== currentShot._id);
      if (willCompleteAllShots && projectId) {
        router.push(`/project/${projectId}/report`);
        return;
      }
      setSelectedShotId(remaining.length > 0 ? remaining[0]._id : null);
      if (remaining.length > 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        closeCamera();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [currentShot, recordedBlob, recordedDuration, generateUploadUrl, saveToLibrary, linkScene, analyzeStrongMoments, pendingShots, totalShots, capturedCount, isUploading, projectId, router, closeCamera]);

  const saveToLibraryOnly = useCallback(async () => {
    if (!currentShot || !recordedBlob || !projectId) return;
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const contentType =
        recordedBlob.type.split(";")[0].trim() || "video/webm";
      const storageId = await new Promise<Id<"_storage">>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as { storageId: Id<"_storage"> };
              resolve(data.storageId);
            } catch {
              reject(new Error("Invalid upload response"));
            }
          } else {
            reject(new Error(xhr.responseText ? `${xhr.status}: ${xhr.responseText}` : `Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(recordedBlob);
      });
      await saveToLibrary({
        projectId,
        shotId: currentShot._id,
        storageId,
        duration: Math.round(recordedDuration),
      });
      setRecordedBlob(null);
      setRecordedDuration(0);
      setRecordedBlobUrl(null);
      setPreviewAspect(null);
      setSavedToLibraryFeedback(true);
      setTimeout(() => setSavedToLibraryFeedback(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [currentShot, recordedBlob, recordedDuration, projectId, generateUploadUrl, saveToLibrary, isUploading]);

  const [replaceModalOpen, setReplaceModalOpen] = useState(false);

  const retake = useCallback(() => {
    setRecordedBlob(null);
    setRecordedDuration(0);
    setPreviewAspect(null);
  }, []);

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
    <div className="p-4 max-w-lg mx-auto pb-28">
      <div className="mb-4 space-y-1">
        {currentShot && (
          <div>
            <button
              type="button"
              onClick={() => setShowExplanation((v) => !v)}
              aria-label="Show shot type tips"
              className="inline-flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground text-left underline decoration-dashed underline-offset-2 hover:no-underline"
            >
              <span className="break-words min-w-0">Scene {currentShot.order + 1}: {currentShot.title}</span>
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            {showExplanation && (
              <div className="mt-2 text-xs text-muted-foreground rounded-lg bg-muted/60 px-3 py-2 space-y-2">
                <p>
                  <span className="font-medium text-foreground">Shot type: </span>
                  {SHOT_CATEGORY_LABELS[currentShot.shotCategory ?? ""] ?? currentShot.shotCategory ?? "—"}
                </p>
                {currentShot.description && (
                  <p>
                    <span className="font-medium text-foreground">Description: </span>
                    {currentShot.description}
                  </p>
                )}
                <p>{getShotExplanation(currentShot.shotCategory, currentShot.title)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      {/* Shot list — above camera; tap to select which shot to capture */}
      <Card className="mb-4 relative z-10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-medium text-foreground">Shot list</h2>
            <button
              type="button"
              onClick={() => setShotListExpanded((v) => !v)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label={shotListExpanded ? "Collapse shot list" : "Expand shot list"}
            >
              {shotListExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          {shotListExpanded && (
          <>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm mb-2">
            <span className="text-muted-foreground break-words min-w-0">
              {capturedCount} of {totalShots} shots assigned
            </span>
            {allCaptured ? (
              <span className="text-muted-foreground font-medium text-primary break-words min-w-0">
                Project complete
              </span>
            ) : nextPendingAfterSelected ? (
              <span className="text-muted-foreground break-words min-w-0 max-w-full">
                Next: {nextPendingAfterSelected.title}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mb-2">Tap a shot to capture or upload for it.</p>
          <ul className="list-none space-y-2 max-h-48 overflow-y-auto touch-pan-y px-3 sm:px-4 py-3">
            {shots.map((shot) => {
              const savedNotAssigned = shot.status !== "captured" && shotIdsWithLibraryMedia.has(shot._id);
              return (
              <li key={shot._id} className="list-none px-3 sm:px-4">
                <button
                  type="button"
                  onClick={() => setSelectedShotId(shot._id)}
                  className={cn(
                    "w-full flex items-center gap-2 text-sm min-h-11 py-2 px-3 rounded-xl text-left transition-colors cursor-pointer border border-input bg-card text-foreground",
                    shot.status === "captured" && "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800",
                    savedNotAssigned && "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800",
                    shot.status === "pending" && !savedNotAssigned && "bg-primary/10 dark:bg-primary/20",
                    shot.status === "skipped" && "opacity-60 text-muted-foreground",
                    selectedShotId === shot._id && shot.status === "captured" &&
                      "ring-2 ring-green-600 dark:ring-green-500 ring-offset-2 font-medium border-2 border-green-600 dark:border-green-500 bg-green-200/80 dark:bg-green-800/40",
                    selectedShotId === shot._id && savedNotAssigned &&
                      "ring-2 ring-yellow-600 dark:ring-yellow-500 ring-offset-2 font-medium border-2 border-yellow-600 dark:border-yellow-500 bg-yellow-200/80 dark:bg-yellow-800/40",
                    selectedShotId === shot._id && shot.status !== "captured" && !savedNotAssigned &&
                      "ring-2 ring-primary ring-offset-2 font-medium bg-primary/25 border-primary/50",
                    "hover:bg-muted/80"
                  )}
                >
                  <span
                    className={cn(
                      "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium",
                      shot.status === "captured" && "bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100",
                      savedNotAssigned && "bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100",
                      shot.status === "skipped" && "bg-muted text-muted-foreground",
                      shot.status === "pending" && !savedNotAssigned && "bg-primary text-primary-foreground",
                      selectedShotId === shot._id && shot.status === "captured" &&
                        "ring-2 ring-green-600 dark:ring-green-500 ring-offset-1 ring-offset-background",
                      selectedShotId === shot._id && savedNotAssigned &&
                        "ring-2 ring-yellow-600 dark:ring-yellow-500 ring-offset-1 ring-offset-background",
                      selectedShotId === shot._id && shot.status !== "captured" && !savedNotAssigned &&
                        "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    )}
                  >
                    {shot.order + 1}
                  </span>
                  <span className="break-words min-w-0 flex-1">{shot.title}</span>
                  {shot.status === "captured" && (
                    <>
                      <span className="text-primary shrink-0" aria-hidden>✓</span>
                      {shot.sceneDuration != null && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDuration(shot.sceneDuration)}
                        </span>
                      )}
                    </>
                  )}
                  {shot.status === "skipped" && <span className="shrink-0" aria-hidden>−</span>}
                </button>
              </li>
            );
            })}
          </ul>
          </>
          )}
        </CardContent>
      </Card>

      {/* Camera / preview area */}
      <Card className="mb-6 overflow-hidden bg-muted/50">
        <CardContent
          className={cn(
            "relative p-0 flex flex-col items-center justify-center",
            recordedBlob ||
            (selectedShot?.status === "captured" && selectedShot?.sceneStorageId && sceneUrl)
              ? ""
              : "max-h-[70vh]",
            !cardAspect && cameraOpen && "aspect-[9/16]"
          )}
          style={cardContentStyle}
        >
          {recordedBlob ? (
            <div className="flex flex-1 flex-col items-center gap-4 p-4 w-full min-h-0 min-w-0">
              <div className="w-full flex items-center justify-center flex-shrink-0 max-h-[50vh] min-h-[200px]">
                {recordedBlobUrl && (
                  <video
                    key={recordedBlobUrl}
                    src={recordedBlobUrl}
                    controls
                    playsInline
                    className="max-w-full max-h-full w-full h-full object-contain rounded-lg bg-black"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth && v.videoHeight)
                        setPreviewAspect({ w: v.videoWidth, h: v.videoHeight });
                    }}
                  />
                )}
              </div>
              {isUploading && (
                <div className="w-full space-y-1">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{
                        width: uploadProgress != null ? `${uploadProgress}%` : "100%",
                        animation: uploadProgress == null ? "pulse 1.5s ease-in-out infinite" : undefined,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {uploadProgress != null ? `Uploading… ${uploadProgress}%` : "Uploading…"}
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 w-full flex-wrap">
                <Button
                  variant="outline"
                  className="flex-1 min-h-11 min-w-0 text-sm whitespace-normal break-words"
                  onClick={retake}
                  disabled={isUploading}
                >
                  Retake
                </Button>
                <Button
                  className="flex-1 min-h-11 min-w-0 text-sm whitespace-normal break-words"
                  onClick={confirmCapture}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading…" : "Assign Video"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-h-11 min-w-0 text-sm whitespace-normal break-words px-2"
                  onClick={saveToLibraryOnly}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading…" : "Save to Library"}
                </Button>
              </div>
              {savedToLibraryFeedback && (
                <p className="text-sm text-primary font-medium text-center">Saved to library</p>
              )}
            </div>
          ) : selectedShot?.status === "captured" &&
            selectedShot?.sceneStorageId &&
            sceneUrl ? (
            <div className="flex flex-1 flex-col items-center gap-4 p-4 w-full min-h-0 min-w-0">
              <div className="w-full flex items-center justify-center flex-shrink-0" style={{ minHeight: "min(40vh, 280px)" }}>
                <video
                  ref={reviewVideoRef}
                  src={sceneUrl}
                  controls
                  playsInline
                  autoPlay
                  loop
                  muted
                  className="max-w-full max-h-full w-full h-full object-contain rounded-lg bg-black"
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight)
                      setPreviewAspect({ w: v.videoWidth, h: v.videoHeight });
                  }}
                />
              </div>
              {assignedVideoInLibrary && (
                <p className="text-xs text-primary font-medium flex-shrink-0">Saved to library</p>
              )}
              <div className="flex flex-wrap gap-2 w-full justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReplaceModalOpen(true)}
                >
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!selectedShot._id) return;
                    try {
                      await unassignShot({ shotId: selectedShot._id });
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unassign failed.");
                    }
                  }}
                >
                  Unassign
                </Button>
              </div>
              <div className="w-full space-y-2 flex-shrink-0 min-h-0">
                <p className="text-sm font-medium text-foreground">Strong moments</p>
                {selectedShot.strongMoments && selectedShot.strongMoments.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {selectedShot.strongMoments.map((m, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-primary font-medium hover:underline"
                          onClick={() => {
                            reviewVideoRef.current && (reviewVideoRef.current.currentTime = m.timestampSeconds);
                          }}
                        >
                          {formatDuration(m.timestampSeconds)}
                        </button>
                        <span className="text-muted-foreground">{m.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : analyzingShotId === selectedShot._id ? (
                  <p className="text-xs text-muted-foreground">Analyzing…</p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={analyzingShotId !== null}
                    onClick={async () => {
                      if (!selectedShot._id) return;
                      setAnalyzingShotId(selectedShot._id);
                      try {
                        await analyzeStrongMoments({ shotId: selectedShot._id });
                      } finally {
                        setAnalyzingShotId(null);
                      }
                    }}
                  >
                    Find strong moments
                  </Button>
                )}
              </div>
              <div className="w-full space-y-2 flex-shrink-0 min-h-0">
                <p className="text-sm font-medium text-foreground">Scene feedback</p>
                {revealedFeedbackShotId === selectedShot._id && selectedShot.sceneFeedback ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{selectedShot.sceneFeedback.alignmentSummary}</p>
                    {selectedShot.sceneFeedback.pros.length > 0 && (
                      <div>
                        <p className="font-medium text-foreground mb-1">Pros</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          {selectedShot.sceneFeedback.pros.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedShot.sceneFeedback.cons.length > 0 && (
                      <div>
                        <p className="font-medium text-foreground mb-1">Cons</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          {selectedShot.sceneFeedback.cons.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : selectedShot.sceneFeedback ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealedFeedbackShotId(selectedShot._id)}
                  >
                    Get AI Feedback
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Run analysis above to see alignment and feedback.
                  </p>
                )}
              </div>
            </div>
          ) : selectedShot?.status === "captured" &&
            selectedShot?.sceneStorageId &&
            sceneUrl === null ? (
            <p className="text-sm text-muted-foreground p-4">
              Video unavailable
            </p>
          ) : cameraOpen ? (
            <div className="flex flex-col flex-1 min-h-0 w-full">
              <div
                ref={cameraWrapperRef}
                className="flex-1 min-h-0 flex items-center justify-center bg-black/5 rounded-lg overflow-hidden relative w-full"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                  onLoadedMetadata={() => {
                    const v = videoRef.current;
                    if (v?.videoWidth && v?.videoHeight)
                      setStreamAspect({ w: v.videoWidth, h: v.videoHeight });
                  }}
                />
                {!isFullscreen ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-9 w-9 rounded-lg bg-background/80 hover:bg-background shadow-md"
                    aria-label="Fullscreen camera"
                    onClick={() => {
                      cameraWrapperRef.current?.requestFullscreen?.().catch(() => {});
                    }}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-9 w-9 rounded-lg bg-background/80 hover:bg-background shadow-md z-10"
                    aria-label="Exit fullscreen"
                    onClick={() => document.exitFullscreen?.()}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex justify-center gap-2 pt-4 pb-2">
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
                    className="min-h-12 rounded-full w-14 h-14 bg-red-600 text-white hover:bg-red-700 shadow-lg ring-2 ring-background/80 animate-pulse"
                    onClick={stopRecording}
                  >
                    Stop
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-start gap-4 p-6 w-full">
              <p className="text-sm text-muted-foreground text-center">
                Open the camera to record this shot.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12"
                  onClick={openCamera}
                  disabled={!currentShot}
                >
                  Open camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-h-12"
                  onClick={() => setReplaceModalOpen(true)}
                  disabled={!currentShot}
                  aria-label="Choose video from gallery"
                >
                  Gallery
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {cameraOpen && !recordedBlob && currentShot && (
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            className="flex-1 min-h-11"
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

      <div className="mt-6">
        <Button className="w-full min-h-11" asChild>
          <Link href={`/project/${project._id}`}>Back to plan</Link>
        </Button>
      </div>

      {selectedShot && (
        <ReplaceVideoModal
          open={replaceModalOpen}
          onClose={() => setReplaceModalOpen(false)}
          projectId={projectId}
          shotId={selectedShot._id}
          shots={(shots ?? []).map((s) => ({ _id: s._id, sceneStorageId: s.sceneStorageId }))}
          linkScene={linkScene}
          analyzeStrongMoments={analyzeStrongMoments}
        />
      )}
    </div>
  );
}
