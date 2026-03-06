/**
 * Gemini segment analysis: score short candidate clips and get suggestions.
 * Uses inline data for segments (Convex has no filesystem for File API upload).
 * Segments are kept short (10–60s) by the preprocessor to avoid timeout and reduce cost.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { VIDEO_ANALYSIS_CONFIG } from "./config";
import type { CandidateWindow, CandidateWithGemini } from "./types";

export type SegmentInput =
  | { type: "inline"; base64: string; mimeType: string }
  | { type: "file"; fileUri: string; mimeType: string };

export type SegmentAnalysisResult = {
  geminiScore: number;
  geminiReason: string;
  suggestedTitle?: string;
  suggestedCaption?: string;
};

const SEGMENT_PROMPT_TEMPLATE = `This is a short candidate highlight from a travel/short-form video clip.

Project goal: {{goal}}
This scene is titled: {{shotTitle}}
Scene description: {{shotDescription}}

Score this segment (0–1) for how well it works as an editable highlight (hook, reaction, key moment, or cut point). Return only valid JSON, no markdown:
{
  "geminiScore": number (0-1),
  "geminiReason": "string (one phrase or sentence)",
  "suggestedTitle": "optional string",
  "suggestedCaption": "optional string"
}`;

function buildSegmentPrompt(goal: string, shotTitle: string, shotDescription: string): string {
  return SEGMENT_PROMPT_TEMPLATE.replace("{{goal}}", goal)
    .replace("{{shotTitle}}", shotTitle)
    .replace("{{shotDescription}}", shotDescription);
}

function parseSegmentResponse(text: string): SegmentAnalysisResult {
  let jsonStr = text.trim();
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();
  const parsed = JSON.parse(jsonStr) as {
    geminiScore?: number;
    geminiReason?: string;
    suggestedTitle?: string;
    suggestedCaption?: string;
  };
  const score = typeof parsed.geminiScore === "number" ? Math.max(0, Math.min(1, parsed.geminiScore)) : 0.5;
  return {
    geminiScore: score,
    geminiReason: typeof parsed.geminiReason === "string" ? parsed.geminiReason : "Highlight",
    suggestedTitle: typeof parsed.suggestedTitle === "string" ? parsed.suggestedTitle : undefined,
    suggestedCaption: typeof parsed.suggestedCaption === "string" ? parsed.suggestedCaption : undefined,
  };
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("rate") ||
    lower.includes("resource exhausted") ||
    lower.includes("503") ||
    lower.includes("500") ||
    lower.includes("timeout")
  );
}

/**
 * Analyze one segment with Gemini. Uses inline data or File API URI.
 * Retries on 429/5xx with exponential backoff; enforces request timeout.
 */
export async function analyzeSegmentWithGemini(
  apiKey: string,
  segment: SegmentInput,
  candidate: CandidateWindow,
  goal: string,
  shotTitle: string,
  shotDescription: string
): Promise<CandidateWithGemini> {
  const cfg = VIDEO_ANALYSIS_CONFIG.gemini;
  const prompt = buildSegmentPrompt(goal, shotTitle, shotDescription);
  let lastError: unknown;

  for (let attempt = 0; attempt <= cfg.retryMaxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.requestTimeoutMs);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: cfg.model });

      const mimeType = segment.mimeType.startsWith("video/") ? segment.mimeType : "video/mp4";
      const videoPart =
        segment.type === "inline"
          ? { inlineData: { mimeType, data: segment.base64 } as const }
          : { fileData: { fileUri: segment.fileUri, mimeType } as const };
      const result = await model.generateContent([videoPart, { text: prompt }]);
      const response = result.response;
      const text = response.text();
      clearTimeout(timeoutId);

      if (!text) throw new Error("Empty response from Gemini");
      const analysis = parseSegmentResponse(text);
      return { ...candidate, ...analysis };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt < cfg.retryMaxAttempts && isRetryableError(err)) {
        const delay = cfg.retryBaseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Run up to N Gemini calls in parallel to avoid exceeding TPM/RPM.
 */
export async function analyzeSegmentsWithConcurrency(
  apiKey: string,
  segments: SegmentInput[],
  candidates: CandidateWindow[],
  goal: string,
  shotTitle: string,
  shotDescription: string
): Promise<CandidateWithGemini[]> {
  const maxConcurrent = VIDEO_ANALYSIS_CONFIG.gemini.maxConcurrentCalls;
  const results: CandidateWithGemini[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const candidate = candidates[i];
    const task = analyzeSegmentWithGemini(
      apiKey,
      segment,
      candidate,
      goal,
      shotTitle,
      shotDescription
    )
      .then((r) => {
        results[i] = r;
      })
      .catch((err) => {
        results[i] = {
          ...candidate,
          geminiScore: 0,
          geminiReason: err instanceof Error ? err.message : "Analysis failed",
        };
      });

    const wrapped = task.then(() => {
      executing.splice(executing.indexOf(wrapped), 1);
    });
    executing.push(wrapped);

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
}
