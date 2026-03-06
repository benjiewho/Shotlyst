/**
 * Detect scene change timestamps. Used to build candidate windows so Gemini receives only relevant segments (reduces timeout/cost).
 */

import { getSceneChangeTimestamps } from "../ffmpeg.js";

export type SceneChangeSignal = { timestampSeconds: number; score: number };

export async function detectSceneChanges(
  filePath: string,
  threshold: number
): Promise<SceneChangeSignal[]> {
  const timestamps = await getSceneChangeTimestamps(filePath, threshold);
  return timestamps.map((t) => ({ timestampSeconds: t, score: 1 }));
}
