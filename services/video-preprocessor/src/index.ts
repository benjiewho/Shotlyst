/**
 * Video preprocessing HTTP service. POST /candidates returns candidate highlight windows
 * (and optional clip URLs) so Convex sends only short segments to Gemini—reduces timeout and cost.
 */

import express from "express";
import { readFileSync } from "fs";
import { downloadToTemp, unlinkSafe } from "./ffmpeg.js";
import { mergeConfig, type PipelineConfig } from "./config.js";
import { extractVideoMetadata } from "./pipeline/extractVideoMetadata.js";
import { detectSceneChanges } from "./pipeline/detectSceneChanges.js";
import { detectMotionSpikes } from "./pipeline/detectMotionSpikes.js";
import { detectAudioSpikes } from "./pipeline/detectAudioSpikes.js";
import { detectSpeechEmphasis } from "./pipeline/detectSpeechEmphasis.js";
import { mergeCandidateMoments, type CandidateWindow } from "./pipeline/mergeCandidateMoments.js";
import { clipCandidateSegments } from "./pipeline/clipCandidateSegments.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT) || 3080;
const CLIP_TTL_MS = 5 * 60 * 1000;

const clipStore = new Map<
  string,
  { path: string; createdAt: number }
>();

function cleanupClips(): void {
  const now = Date.now();
  for (const [id, entry] of clipStore.entries()) {
    if (now - entry.createdAt > CLIP_TTL_MS) {
      unlinkSafe(entry.path);
      clipStore.delete(id);
    }
  }
}

app.post("/candidates", async (req, res) => {
  const { videoUrl, proxyUrl, config: configOverrides } = req.body as {
    videoUrl?: string;
    proxyUrl?: string;
    config?: Partial<PipelineConfig>;
  };

  if (!videoUrl || typeof videoUrl !== "string") {
    res.status(400).json({ error: "videoUrl required" });
    return;
  }

  const config = mergeConfig(configOverrides);
  let inputPath: string | null = null;

  try {
    inputPath = await downloadToTemp(proxyUrl ?? videoUrl);
    const meta = await extractVideoMetadata(inputPath);
    const durationSeconds = meta.durationSeconds;
    if (durationSeconds <= 0) {
      res.json({ candidates: [], durationSeconds: 0 });
      return;
    }

    const [scene, motion, audio, speech] = await Promise.all([
      detectSceneChanges(inputPath, config.sceneChangeThreshold),
      detectMotionSpikes(inputPath, config.motionSpikeThreshold),
      detectAudioSpikes(inputPath, config.audioSpikeThreshold),
      detectSpeechEmphasis(inputPath, config.speechEmphasisThreshold),
    ]);

    const candidates = mergeCandidateMoments(
      { scene, motion, audio, speech },
      durationSeconds,
      config
    );

    const clips = await clipCandidateSegments(inputPath, candidates);
    const baseUrl = (process.env.PREPROCESSOR_PUBLIC_URL || (req.protocol + "://" + req.get("host") || "")).replace(/\/$/, "");
    const clipUrls: string[] = [];

    for (const { candidate: _c, localPath } of clips) {
      const id = Math.random().toString(36).slice(2, 12);
      clipStore.set(id, { path: localPath, createdAt: Date.now() });
      clipUrls.push(`${baseUrl}/clip/${id}`);
    }

    cleanupClips();

    const responseCandidates: CandidateWindow[] = candidates.map((c, i) => ({
      ...c,
      clipUrl: clipUrls[i],
    }));

    res.json({
      candidates: responseCandidates,
      durationSeconds,
      clipUrls,
    });
  } catch (err) {
    console.error("[POST /candidates]", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Preprocessing failed",
    });
  } finally {
    if (inputPath) unlinkSafe(inputPath);
  }
});

app.get("/clip/:id", (req, res) => {
  cleanupClips();
  const entry = clipStore.get(req.params.id);
  if (!entry) {
    res.status(404).send("Clip not found or expired");
    return;
  }
  try {
    const buf = readFileSync(entry.path);
    res.setHeader("Content-Type", "video/mp4");
    res.send(buf);
    unlinkSafe(entry.path);
    clipStore.delete(req.params.id);
  } catch {
    res.status(500).send("Failed to read clip");
  }
});

app.listen(PORT, () => {
  console.log(`Video preprocessor listening on port ${PORT}`);
});
