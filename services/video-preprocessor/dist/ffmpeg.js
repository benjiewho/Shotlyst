/**
 * Wrapper for ffmpeg/ffprobe. Used for metadata, scene detection, motion/audio analysis, and clipping.
 * Preprocessing here keeps segment sizes small so Gemini only receives short clips (reduces timeout and cost).
 */
import { execFile } from "child_process";
import { promisify } from "util";
import { createWriteStream, existsSync, unlinkSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import fetch from "node-fetch";
const execFileAsync = promisify(execFile);
/** Run ffprobe to get duration, fps, resolution. */
export async function getMetadata(filePath) {
    const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath,
    ]);
    const data = JSON.parse(stdout);
    const format = data.format ?? {};
    const videoStream = data.streams?.find((s) => s.codec_type === "video") ?? {
        width: 0,
        height: 0,
        r_frame_rate: "30/1",
        codec_type: "video",
    };
    const duration = parseFloat(format.duration ?? "0") || 0;
    const rFrameRate = videoStream.r_frame_rate ?? "30/1";
    const [num, den] = rFrameRate.split("/").map(Number);
    const fps = den ? num / den : 30;
    return {
        durationSeconds: duration,
        fps: Math.round(fps * 100) / 100,
        width: videoStream.width ?? 0,
        height: videoStream.height ?? 0,
        codec: videoStream.codec_type,
    };
}
/** Download a URL to a temp file. Caller must unlink when done. */
export async function downloadToTemp(url) {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok)
        throw new Error(`Download failed: ${res.status}`);
    const outPath = join(tmpdir(), `preprocessor-${randomUUID()}.mp4`);
    const stream = res.body;
    const dest = createWriteStream(outPath);
    await new Promise((resolve, reject) => {
        stream.pipe(dest);
        stream.on("error", reject);
        dest.on("finish", resolve);
        dest.on("error", reject);
    });
    return outPath;
}
/** Extract segment [startSeconds, endSeconds] to outPath. */
export async function extractSegment(inputPath, startSeconds, endSeconds, outPath) {
    const duration = endSeconds - startSeconds;
    await execFileAsync("ffmpeg", [
        "-y",
        "-ss",
        String(startSeconds),
        "-i",
        inputPath,
        "-t",
        String(duration),
        "-c",
        "copy",
        "-avoid_negative_ts",
        "1",
        outPath,
    ]);
}
/**
 * Get scene change timestamps using ffmpeg select filter.
 * Outputs frame pts when scene score exceeds threshold (reduces payload to Gemini by finding cut points).
 */
export async function getSceneChangeTimestamps(filePath, _threshold) {
    try {
        const { stderr } = await execFileAsync("ffmpeg", [
            "-i",
            filePath,
            "-vf",
            `select='gt(scene\\,${_threshold})',showinfo`,
            "-vsync",
            "vfr",
            "-f",
            "null",
            "-",
        ], { maxBuffer: 1024 * 1024 });
        const times = [];
        const re = /pts_time=([\d.]+)/g;
        let m;
        while ((m = re.exec(stderr)) !== null) {
            times.push(parseFloat(m[1]));
        }
        return times;
    }
    catch {
        return [];
    }
}
/** Extract audio to temp WAV and return path. */
export async function extractAudioToTemp(inputPath) {
    const outPath = join(tmpdir(), `preprocessor-audio-${randomUUID()}.wav`);
    await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        outPath,
    ]);
    return outPath;
}
export function unlinkSafe(path) {
    try {
        if (existsSync(path))
            unlinkSync(path);
    }
    catch {
        // ignore
    }
}
export function readFileAsBase64(path) {
    return readFileSync(path, { encoding: "base64" });
}
