/**
 * Default thresholds and limits for the preprocessing pipeline.
 * Request body can override these to tune detection (reduces timeout/cost by sending only relevant segments to Gemini).
 */
export const DEFAULT_CONFIG = {
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
};
export function mergeConfig(overrides) {
    return { ...DEFAULT_CONFIG, ...overrides };
}
