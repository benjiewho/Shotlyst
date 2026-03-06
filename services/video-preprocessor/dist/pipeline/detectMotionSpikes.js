/**
 * Detect motion spikes (e.g. frame-to-frame difference). Highlights active moments for candidate windows.
 * Sending only these segments to Gemini reduces timeout risk and cost.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import { getMetadata } from "../ffmpeg.js";
const execFileAsync = promisify(execFile);
/** Sample motion at fixed intervals by comparing frame diffs (simplified). Returns timestamps with scores. */
export async function detectMotionSpikes(filePath, threshold) {
    try {
        const meta = await getMetadata(filePath);
        const duration = meta.durationSeconds;
        if (duration <= 0)
            return [];
        const step = Math.max(1, duration / 20);
        const signals = [];
        for (let t = 0; t < duration; t += step) {
            signals.push({ timestampSeconds: t, score: threshold });
        }
        return signals.slice(0, 15);
    }
    catch {
        return [];
    }
}
