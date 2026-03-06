/**
 * Extract each candidate window as a short clip (ffmpeg) and return paths or URLs.
 * Caller can serve these so Convex fetches only segments instead of the full video (reduces timeout and cost).
 */

import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { extractSegment, unlinkSafe } from "../ffmpeg.js";
import type { CandidateWindow } from "./mergeCandidateMoments.js";

export type ClipResult = { candidate: CandidateWindow; localPath: string };

/** Extract segments to temp files. Caller must clean up with unlinkSafe(localPath). */
export async function clipCandidateSegments(
  inputPath: string,
  candidates: CandidateWindow[]
): Promise<ClipResult[]> {
  const results: ClipResult[] = [];
  for (const c of candidates) {
    const outPath = join(tmpdir(), `preprocessor-clip-${randomUUID()}.mp4`);
    try {
      await extractSegment(inputPath, c.startTime, c.endTime, outPath);
      results.push({ candidate: c, localPath: outPath });
    } catch {
      unlinkSafe(outPath);
    }
  }
  return results;
}
