/**
 * HTTP client for the video preprocessing service.
 * Convex actions call this to get candidate highlight windows (and optional clip URLs)
 * so we only send short segments to Gemini, reducing timeout risk and cost.
 */

import { VIDEO_ANALYSIS_CONFIG } from "./config";
import type {
  PreprocessorCandidatesRequest,
  PreprocessorCandidatesResponse,
  CandidateWindow,
} from "./types";

export type GetCandidatesOptions = {
  videoUrl: string;
  proxyUrl?: string;
  timeoutMs?: number;
  configOverrides?: PreprocessorCandidatesRequest["config"];
};

/**
 * POST to the preprocessor service to get candidate highlight windows.
 * Returns typed list of candidates; if the service returns clipUrls, they are merged into each candidate.
 */
export async function getCandidates(
  options: GetCandidatesOptions
): Promise<PreprocessorCandidatesResponse> {
  const baseUrl = VIDEO_ANALYSIS_CONFIG.preprocessor.url;
  if (!baseUrl?.trim()) {
    throw new Error("VIDEO_PREPROCESSOR_URL is not set");
  }

  const url = baseUrl.replace(/\/$/, "") + "/candidates";
  const timeoutMs = options.timeoutMs ?? VIDEO_ANALYSIS_CONFIG.preprocessor.timeoutMs;

  const body: PreprocessorCandidatesRequest = {
    videoUrl: options.videoUrl,
    proxyUrl: options.proxyUrl,
    config: options.configOverrides ?? {
      sceneChangeThreshold: VIDEO_ANALYSIS_CONFIG.candidates.sceneChangeThreshold,
      motionSpikeThreshold: VIDEO_ANALYSIS_CONFIG.candidates.motionSpikeThreshold,
      audioSpikeThreshold: VIDEO_ANALYSIS_CONFIG.candidates.audioSpikeThreshold,
      speechEmphasisThreshold: VIDEO_ANALYSIS_CONFIG.candidates.speechEmphasisThreshold,
      maxCandidates: VIDEO_ANALYSIS_CONFIG.candidates.maxCandidates,
      paddingBeforeSeconds: VIDEO_ANALYSIS_CONFIG.candidates.paddingBeforeSeconds,
      paddingAfterSeconds: VIDEO_ANALYSIS_CONFIG.candidates.paddingAfterSeconds,
      targetDurationMinSeconds: VIDEO_ANALYSIS_CONFIG.candidates.targetDurationMinSeconds,
      targetDurationMaxSeconds: VIDEO_ANALYSIS_CONFIG.candidates.targetDurationMaxSeconds,
      maxClipDurationSeconds: VIDEO_ANALYSIS_CONFIG.candidates.maxClipDurationSeconds,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Preprocessor returned ${resp.status}: ${text || resp.statusText}`);
    }

    const data = (await resp.json()) as PreprocessorCandidatesResponse;
    if (!Array.isArray(data.candidates)) {
      throw new Error("Preprocessor response missing candidates array");
    }

    // Merge clipUrls into candidates if returned
    const clipUrls = data.clipUrls;
    const candidates: CandidateWindow[] = data.candidates.map((c, i) => ({
      ...c,
      ...(clipUrls?.[i] && { clipUrl: clipUrls[i] }),
    }));

    return {
      candidates,
      durationSeconds: data.durationSeconds,
      clipUrls: data.clipUrls,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("Preprocessor request timed out; try a shorter clip or check the service.");
      }
      throw err;
    }
    throw err;
  }
}
