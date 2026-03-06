/**
 * Video analysis pipeline config: thresholds, limits, and timeouts.
 * Used by the Convex orchestrator and passed to the preprocessor service.
 * This architecture keeps segment sizes small so Gemini requests stay under timeout and cost is reduced.
 */

export const VIDEO_ANALYSIS_CONFIG = {
  preprocessor: {
    url: process.env.VIDEO_PREPROCESSOR_URL ?? "",
    timeoutMs: 90_000,
    useLowResProxy: true,
  },
  candidates: {
    sceneChangeThreshold: 0.4,
    motionSpikeThreshold: 0.35,
    audioSpikeThreshold: 0.4,
    speechEmphasisThreshold: 0.3,
    maxCandidates: 8,
    paddingBeforeSeconds: 5,
    paddingAfterSeconds: 8,
    targetDurationMinSeconds: 10,
    targetDurationMaxSeconds: 45,
    maxClipDurationSeconds: 60,
  },
  gemini: {
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    fileApiPreferredOverInlineAboveBytes: 4 * 1024 * 1024,
    maxConcurrentCalls: 2,
    retryMaxAttempts: 3,
    retryBaseDelayMs: 1000,
    requestTimeoutMs: 60_000,
  },
  /** Below this size and duration, skip preprocessor and send full video inline (avoids preprocessor overhead). */
  fullVideoInlineMaxBytes: 4 * 1024 * 1024,
  fullVideoMaxDurationSeconds: 30,
  /** Timeout when fetching the source video URL from storage (avoids hanging on slow networks). */
  videoFetchTimeoutMs: 45_000,
} as const;

export type VideoAnalysisConfig = typeof VIDEO_ANALYSIS_CONFIG;
