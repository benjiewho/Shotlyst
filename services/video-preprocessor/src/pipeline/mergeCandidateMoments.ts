/**
 * Merge scene, motion, audio, and speech signals into candidate highlight windows.
 * Apply padding, dedupe overlaps, enforce target duration (10s–45s, max 60s) and max candidates.
 * This keeps segments short so Gemini only receives small clips (reduces timeout and cost).
 */

import type { PipelineConfig } from "../config.js";
import type { SceneChangeSignal } from "./detectSceneChanges.js";
import type { MotionSignal } from "./detectMotionSpikes.js";
import type { AudioSpikeSignal } from "./detectAudioSpikes.js";
import type { SpeechEmphasisSignal } from "./detectSpeechEmphasis.js";

export type CandidateWindow = {
  startTime: number;
  endTime: number;
  duration: number;
  motionScore: number;
  audioSpikeScore: number;
  sceneChangeScore: number;
  speechEmphasisScore: number;
  mergedScore: number;
};

function mergeOverlapping(
  intervals: Array<{ start: number; end: number; scores: { motion: number; audio: number; scene: number; speech: number } }>,
  durationSeconds: number,
  config: PipelineConfig
): CandidateWindow[] {
  if (intervals.length === 0) return [];
  const padded = intervals.map((i) => ({
    start: Math.max(0, i.start - config.paddingBeforeSeconds),
    end: Math.min(durationSeconds, i.end + config.paddingAfterSeconds),
    scores: i.scores,
  }));
  padded.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number; scores: typeof padded[0]["scores"] }> = [];
  for (const p of padded) {
    const last = merged[merged.length - 1];
    if (last && p.start <= last.end) {
      last.end = Math.max(last.end, p.end);
      last.scores = {
        motion: Math.max(last.scores.motion, p.scores.motion),
        audio: Math.max(last.scores.audio, p.scores.audio),
        scene: Math.max(last.scores.scene, p.scores.scene),
        speech: Math.max(last.scores.speech, p.scores.speech),
      };
    } else {
      merged.push({ start: p.start, end: p.end, scores: p.scores });
    }
  }
  const targetMin = config.targetDurationMinSeconds;
  const targetMax = config.targetDurationMaxSeconds;
  const maxDur = config.maxClipDurationSeconds;
  const result: CandidateWindow[] = [];
  for (const m of merged) {
    let start = m.start;
    let end = m.end;
    let d = end - start;
    if (d > maxDur) {
      const center = (start + end) / 2;
      start = Math.max(0, center - maxDur / 2);
      end = Math.min(durationSeconds, start + maxDur);
      d = end - start;
    }
    if (d < targetMin && d > 0) {
      const center = (start + end) / 2;
      start = Math.max(0, center - targetMin / 2);
      end = Math.min(durationSeconds, start + targetMin);
    }
    const duration = Math.min(end - start, targetMax, maxDur);
    end = start + duration;
    const mergedScore =
      (m.scores.motion + m.scores.audio + m.scores.scene + m.scores.speech) / 4;
    result.push({
      startTime: start,
      endTime: end,
      duration,
      motionScore: m.scores.motion,
      audioSpikeScore: m.scores.audio,
      sceneChangeScore: m.scores.scene,
      speechEmphasisScore: m.scores.speech,
      mergedScore,
    });
  }
  return result
    .sort((a, b) => b.mergedScore - a.mergedScore)
    .slice(0, config.maxCandidates);
}

export function mergeCandidateMoments(
  signals: {
    scene: SceneChangeSignal[];
    motion: MotionSignal[];
    audio: AudioSpikeSignal[];
    speech: SpeechEmphasisSignal[];
  },
  durationSeconds: number,
  config: PipelineConfig
): CandidateWindow[] {
  const intervals: Array<{
    start: number;
    end: number;
    scores: { motion: number; audio: number; scene: number; speech: number };
  }> = [];

  for (const s of signals.scene) {
    intervals.push({
      start: s.timestampSeconds,
      end: Math.min(durationSeconds, s.timestampSeconds + 5),
      scores: { motion: 0, audio: 0, scene: s.score, speech: 0 },
    });
  }
  for (const m of signals.motion) {
    intervals.push({
      start: m.timestampSeconds,
      end: Math.min(durationSeconds, m.timestampSeconds + 8),
      scores: { motion: m.score, audio: 0, scene: 0, speech: 0 },
    });
  }
  for (const a of signals.audio) {
    intervals.push({
      start: Math.max(0, a.timestampSeconds - 2),
      end: Math.min(durationSeconds, a.timestampSeconds + 6),
      scores: { motion: 0, audio: a.score, scene: 0, speech: 0 },
    });
  }
  for (const s of signals.speech) {
    intervals.push({
      start: s.startSeconds,
      end: s.endSeconds,
      scores: { motion: 0, audio: 0, scene: 0, speech: s.score },
    });
  }

  if (intervals.length === 0) {
    const fallback = [
      { start: 0, end: Math.min(30, durationSeconds), scores: { motion: 0.5, audio: 0.5, scene: 0, speech: 0 } },
    ];
    if (durationSeconds > 30) {
      fallback.push({
        start: durationSeconds / 2 - 15,
        end: durationSeconds / 2 + 15,
        scores: { motion: 0.5, audio: 0.5, scene: 0, speech: 0 },
      });
    }
    return mergeOverlapping(fallback, durationSeconds, config);
  }

  return mergeOverlapping(intervals, durationSeconds, config);
}
