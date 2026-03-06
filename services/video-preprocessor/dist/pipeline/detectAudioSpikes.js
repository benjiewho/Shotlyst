/**
 * Detect audio level spikes (e.g. RMS). Used to find emphasis moments for candidate windows.
 * Preprocessing keeps segments short so Gemini requests stay under timeout and cost is reduced.
 */
import { getMetadata, extractAudioToTemp, unlinkSafe } from "../ffmpeg.js";
import { readFileSync } from "fs";
/** Simple loudness proxy: sample audio in windows and return timestamps with normalized score. */
export async function detectAudioSpikes(filePath, _threshold) {
    let audioPath = null;
    try {
        const meta = await getMetadata(filePath);
        const duration = meta.durationSeconds;
        if (duration <= 0)
            return [];
        audioPath = await extractAudioToTemp(filePath);
        const buf = readFileSync(audioPath);
        const sampleRate = 16000;
        const bytesPerSample = 2;
        const windowSeconds = 1;
        const windowSamples = sampleRate * windowSeconds * bytesPerSample;
        const signals = [];
        for (let offset = 0; offset < buf.length - windowSamples; offset += Math.floor(windowSamples / 2)) {
            let sum = 0;
            for (let i = 0; i < windowSamples && offset + i < buf.length; i += 2) {
                const s = buf.readInt16LE(offset + i);
                sum += Math.abs(s);
            }
            const rms = sum / (windowSamples / 2);
            const normalized = Math.min(1, rms / 8000);
            const t = (offset / bytesPerSample / sampleRate);
            if (normalized > 0.2) {
                signals.push({ timestampSeconds: t, score: normalized });
            }
        }
        return signals.slice(0, 20);
    }
    catch {
        return [];
    }
    finally {
        if (audioPath)
            unlinkSafe(audioPath);
    }
}
