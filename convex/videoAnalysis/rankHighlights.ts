/**
 * Ranks candidate highlights (with Gemini scores) and converts to the format
 * stored on the shot: strongMoments and sceneFeedback.
 * Keeps the rest of the app (Capture, Report) unchanged.
 */

import type { CandidateWithGemini, StrongMoment, SceneFeedback } from "./types";

const MAX_STRONG_MOMENTS = 10;
const MAX_PRO_CONS = 5;

/**
 * Sort by geminiScore (desc), then mergedScore, then startTime.
 * Takes top N and builds strongMoments (timestampSeconds = startTime, reason = geminiReason).
 * Builds sceneFeedback from top reasons and suggested captions.
 */
export function rankHighlights(
  candidates: CandidateWithGemini[],
  options?: { maxMoments?: number }
): { strongMoments: StrongMoment[]; sceneFeedback: SceneFeedback } {
  const maxMoments = options?.maxMoments ?? MAX_STRONG_MOMENTS;

  const sorted = [...candidates].sort((a, b) => {
    if (b.geminiScore !== a.geminiScore) return b.geminiScore - a.geminiScore;
    if (b.mergedScore !== a.mergedScore) return b.mergedScore - a.mergedScore;
    return a.startTime - b.startTime;
  });

  const top = sorted.slice(0, maxMoments);

  const strongMoments: StrongMoment[] = top.map((c) => ({
    timestampSeconds: c.startTime,
    reason: c.geminiReason || "Highlight",
  }));

  const reasons = top.map((c) => c.geminiReason).filter(Boolean);
  const captions = top.map((c) => c.suggestedCaption).filter((s): s is string => !!s?.trim());
  const alignmentSummary =
    reasons.length > 0
      ? `${reasons.length} strong moment(s) identified. ${reasons.slice(0, 2).join(" ")}`
      : "No highlights scored above threshold.";
  const pros = reasons.slice(0, MAX_PRO_CONS);
  const cons = captions.length > 0 ? [`Consider using captions: ${captions.slice(0, 2).join("; ")}`] : [];

  const sceneFeedback: SceneFeedback = {
    alignmentSummary,
    pros,
    cons,
  };

  return { strongMoments, sceneFeedback };
}
