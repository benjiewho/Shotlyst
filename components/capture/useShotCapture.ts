"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type ShotForCapture = {
  _id: Id<"shots">;
  title: string;
  description?: string | null;
  shotCategory?: string | null;
  status?: string;
  sceneStorageId?: Id<"_storage"> | null;
  sceneDuration?: number | null;
  sceneNotes?: string | null;
  order: number;
  strongMoments?: { timestampSeconds: number; reason: string }[] | null;
  sceneFeedback?: {
    alignmentSummary: string;
    pros: string[];
    cons: string[];
  } | null;
};

export type CaptureStateSnapshot = {
  recordedBlobUrl: string | null;
  isUploading: boolean;
  uploadProgress: number | null;
  uploadedStorageId: Id<"_storage"> | null;
  error: string | null;
};

export function useShotCapture({
  currentShot,
  projectId,
  onAssigned,
  onCaptureStateChange,
}: {
  currentShot: ShotForCapture | null;
  projectId: Id<"projects"> | undefined;
  onAssigned?: () => void;
  onCaptureStateChange?: (shotId: Id<"shots">, state: CaptureStateSnapshot) => void;
}) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.shots.generateUploadUrl);
  const linkScene = useMutation(api.shots.linkScene);
  const saveToLibrary = useMutation(api.media.saveToLibrary);
  const analyzeStrongMoments = useAction(api.ai.analyzeVideoForStrongMoments);

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** After auto-upload completes, we store the storageId for "Assign Video" */
  const [uploadedStorageId, setUploadedStorageId] = useState<Id<"_storage"> | null>(null);
  const retakenRef = useRef(false);
  const recordedDurationRef = useRef(0);
  const uploadStartedForBlobRef = useRef<Blob | null>(null);
  /** Shot this capture belongs to (set when blob is set); used for saveToLibrary/linkScene when user swipes away */
  const captureShotIdRef = useRef<Id<"shots"> | null>(null);

  recordedDurationRef.current = recordedDuration;

  const captureShotId = recordedBlob || isUploading || uploadedStorageId ? captureShotIdRef.current : null;

  // Create blob URL when we have a blob; pin captureShotId to the shot that was active when recording started
  useEffect(() => {
    if (!recordedBlob) {
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
        setRecordedBlobUrl(null);
      }
      uploadStartedForBlobRef.current = null;
      return;
    }
    if (currentShot) captureShotIdRef.current = currentShot._id;
    const url = URL.createObjectURL(recordedBlob);
    setRecordedBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setRecordedBlobUrl(null);
    };
    // recordedBlobUrl intentionally omitted to avoid re-running when we set it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedBlob]);

  // Auto-upload when we have a blob and a shot: upload + saveToLibrary, then store storageId (once per blob)
  useEffect(() => {
    if (!recordedBlob || !projectId) return;
    const shotId = captureShotIdRef.current;
    if (!shotId) return;
    if (uploadStartedForBlobRef.current === recordedBlob) return;
    uploadStartedForBlobRef.current = recordedBlob;
    retakenRef.current = false;
    setUploadedStorageId(null);
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        const uploadUrl = await generateUploadUrl();
        const contentType = recordedBlob.type.split(";")[0].trim() || "video/webm";
        const storageId = await new Promise<Id<"_storage">>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && !cancelled) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (cancelled) return;
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText) as { storageId: Id<"_storage"> };
                resolve(data.storageId);
              } catch {
                reject(new Error("Invalid upload response"));
              }
            } else {
              reject(
                new Error(
                  xhr.responseText ? `${xhr.status}: ${xhr.responseText}` : `Upload failed (${xhr.status})`
                )
              );
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("POST", uploadUrl);
          xhr.setRequestHeader("Content-Type", contentType);
          xhr.send(recordedBlob);
        });

        if (cancelled || retakenRef.current) return;
        // Brief wait for duration from video metadata if not yet set
        for (let i = 0; i < 50 && recordedDurationRef.current === 0 && !cancelled && !retakenRef.current; i++) {
          await new Promise((r) => setTimeout(r, 100));
        }
        const duration = Math.round(recordedDurationRef.current);
        await saveToLibrary({
          projectId,
          shotId,
          storageId,
          duration: duration > 0 ? duration : 0,
        });
        if (cancelled || retakenRef.current) return;
        setUploadedStorageId(storageId);
      } catch (err) {
        if (!cancelled && !retakenRef.current) {
          setError(err instanceof Error ? err.message : "Upload failed.");
        }
      } finally {
        if (!cancelled) {
          setIsUploading(false);
          setUploadProgress(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Do not depend on currentShot: upload must complete in background when user switches scenes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedBlob, projectId, generateUploadUrl, saveToLibrary]);

  const confirmCapture = useCallback(async () => {
    const shotIdToLink = captureShotIdRef.current ?? currentShot?._id;
    if (!shotIdToLink || !uploadedStorageId) return;
    setError(null);
    try {
      await linkScene({
        shotId: shotIdToLink,
        storageId: uploadedStorageId,
        duration: Math.round(recordedDuration),
      });
      captureShotIdRef.current = null;
      setRecordedBlob(null);
      setRecordedDuration(0);
      setUploadedStorageId(null);
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
        setRecordedBlobUrl(null);
      }
      onAssigned?.();
      await new Promise((r) => setTimeout(r, 2000));
      const videoUrl = await convex.query(api.shots.getSceneUrlByShotId, {
        shotId: shotIdToLink,
      });
      analyzeStrongMoments({
        shotId: shotIdToLink,
        videoUrl: videoUrl ?? undefined,
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed.");
    }
  }, [
    currentShot?._id,
    uploadedStorageId,
    recordedDuration,
    recordedBlobUrl,
    linkScene,
    convex,
    analyzeStrongMoments,
    onAssigned,
  ]);

  const retake = useCallback(() => {
    retakenRef.current = true;
    uploadStartedForBlobRef.current = null;
    captureShotIdRef.current = null;
    setRecordedBlob(null);
    setRecordedDuration(0);
    setUploadedStorageId(null);
    setError(null);
  }, []);

  // Notify parent of state changes for per-shot persistence when user swipes away
  useEffect(() => {
    const shotId = captureShotIdRef.current;
    if (!shotId || !onCaptureStateChange) return;
    onCaptureStateChange(shotId, {
      recordedBlobUrl,
      isUploading,
      uploadProgress,
      uploadedStorageId,
      error,
    });
  }, [recordedBlobUrl, isUploading, uploadProgress, uploadedStorageId, error, onCaptureStateChange]);

  const handleNativeCameraFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setRecordedBlob(file);
    const url = URL.createObjectURL(file);
    setRecordedBlobUrl(url);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setRecordedDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };
    video.src = url;
  }, []);

  return {
    recordedBlob,
    recordedDuration,
    recordedBlobUrl,
    isUploading,
    uploadProgress,
    error,
    setError,
    uploadedStorageId,
    captureShotId,
    confirmCapture,
    retake,
    handleNativeCameraFile,
  };
}
