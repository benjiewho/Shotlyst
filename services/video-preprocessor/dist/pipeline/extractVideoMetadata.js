/**
 * Extract video metadata (duration, fps, resolution) via ffprobe.
 * Used to clamp candidate windows and support low-res proxy with original timestamps.
 */
import { getMetadata } from "../ffmpeg.js";
export async function extractVideoMetadata(videoPathOrUrl, options) {
    let path = videoPathOrUrl;
    if (options?.isUrl && options?.downloadToTemp) {
        path = await options.downloadToTemp(videoPathOrUrl);
    }
    return getMetadata(path);
}
