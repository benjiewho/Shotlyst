/**
 * Types for the two-stage video analysis pipeline.
 * Preprocessor returns candidate windows; Gemini enriches with scores and suggestions.
 */

/** Candidate highlight window from preprocessing (motion, audio, scene, speech signals). */
export type CandidateWindow = {
  startTime: number;
  endTime: number;
  duration: number;
  motionScore: number;
  audioSpikeScore: number;
  sceneChangeScore: number;
  speechEmphasisScore: number;
  mergedScore: number;
  /** Optional: URL of extracted clip for this segment (from preprocessor). */
  clipUrl?: string;
  /** Optional: base64 of short clip when service returns inline. */
  clipBase64?: string;
};

/** After Gemini analysis of a segment. */
export type CandidateWithGemini = CandidateWindow & {
  geminiScore: number;
  geminiReason: string;
  suggestedTitle?: string;
  suggestedCaption?: string;
};

/** Final highlight result for storage (existing strongMoments format). */
export type StrongMoment = {
  timestampSeconds: number;
  reason: string;
};

/** Existing sceneFeedback shape. */
export type SceneFeedback = {
  alignmentSummary: string;
  pros: string[];
  cons: string[];
};

/** Request body sent to preprocessor POST /candidates */
export type PreprocessorCandidatesRequest = {
  videoUrl: string;
  proxyUrl?: string;
  config?: {
    sceneChangeThreshold?: number;
    motionSpikeThreshold?: number;
    audioSpikeThreshold?: number;
    speechEmphasisThreshold?: number;
    maxCandidates?: number;
    paddingBeforeSeconds?: number;
    paddingAfterSeconds?: number;
    targetDurationMinSeconds?: number;
    targetDurationMaxSeconds?: number;
    maxClipDurationSeconds?: number;
  };
};

/** Response from preprocessor POST /candidates */
export type PreprocessorCandidatesResponse = {
  candidates: CandidateWindow[];
  durationSeconds?: number;
  /** If service extracted clips and uploaded somewhere, URLs per candidate index. */
  clipUrls?: string[];
};
