/**
 * Extract video metadata (duration, fps, resolution) via ffprobe.
 * Used to clamp candidate windows and support low-res proxy with original timestamps.
 */

import { getMetadata, type VideoMetadata } from "../ffmpeg.js";

export async function extractVideoMetadata(
  videoPathOrUrl: string,
  options?: { isUrl?: boolean; downloadToTemp?: (url: string) => Promise<string> }
): Promise<VideoMetadata> {
  let path = videoPathOrUrl;
  if (options?.isUrl && options?.downloadToTemp) {
    path = await options.downloadToTemp(videoPathOrUrl);
  }
  return getMetadata(path);
}
