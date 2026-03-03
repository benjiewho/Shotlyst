"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ShotCategory = "hook_shot" | "establishing_shot" | "action_shots" | "detail_broll";

const STUB_PLAN = {
  goalSummary:
    "Create engaging short-form travel content that captures the location and your experience.",
  suggestedHook:
    "Open with a striking visual or a question that hooks viewers in the first second.",
  recommendedStyle:
    "Quick cuts, clear captions, authentic tone. Keep each shot under 3–5 seconds.",
  shots: [
    {
      type: "must" as const,
      shotCategory: "establishing_shot" as ShotCategory,
      title: "Wide of the space",
      description: "Wide shot of the location to set the scene.",
    },
    {
      type: "must" as const,
      shotCategory: "detail_broll" as ShotCategory,
      title: "Key detail or product close-up",
      description: "Close-up of a key element (dish, view, or activity).",
    },
    {
      type: "nice" as const,
      shotCategory: "action_shots" as ShotCategory,
      title: "Reaction or moment",
      description: "Genuine reaction or transition to keep it authentic.",
    },
  ],
};

type ShotInput = {
  type: "must" | "nice" | "optional";
  shotCategory?: ShotCategory;
  title: string;
  description: string;
};

function titleToCategory(title: string): ShotCategory {
  const t = title.toLowerCase();
  if (t.includes("hook")) return "hook_shot";
  if (t.includes("establishing") || t.includes("establish")) return "establishing_shot";
  if (t.includes("action") || t.includes("reaction") || t.includes("moment")) return "action_shots";
  if (t.includes("detail") || t.includes("b-roll") || t.includes("product")) return "detail_broll";
  return "establishing_shot";
}

function parsePlanFromGemini(text: string): {
  goalSummary: string;
  suggestedHook: string;
  recommendedStyle: string;
  shots: ShotInput[];
} {
  let jsonStr = text.trim();
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();
  const parsed = JSON.parse(jsonStr) as {
    goalSummary?: string;
    suggestedHook?: string;
    recommendedStyle?: string;
    shots?: { type?: string; title?: string; description?: string }[];
  };
  const shots: ShotInput[] = (parsed.shots ?? []).map((s, i) => {
    const title = typeof s.title === "string" ? s.title : `Shot ${i + 1}`;
    const shotCategory =
      (s as { shotCategory?: string }).shotCategory &&
      ["hook_shot", "establishing_shot", "action_shots", "detail_broll"].includes(
        (s as { shotCategory: string }).shotCategory
      )
        ? ((s as { shotCategory: string }).shotCategory as ShotCategory)
        : titleToCategory(title);
    return {
      type: (s.type === "optional" || s.type === "nice" ? s.type : "must") as
        | "must"
        | "nice"
        | "optional",
      shotCategory,
      title,
      description:
        typeof s.description === "string" ? s.description : "No description.",
    };
  });
  return {
    goalSummary: typeof parsed.goalSummary === "string" ? parsed.goalSummary : "",
    suggestedHook:
      typeof parsed.suggestedHook === "string" ? parsed.suggestedHook : "",
    recommendedStyle:
      typeof parsed.recommendedStyle === "string"
        ? parsed.recommendedStyle
        : "",
    shots,
  };
}

export const generatePlan = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(api.projects.get, {
      id: args.projectId,
    });
    if (!project) throw new Error("Project not found");

    let plan: {
      goalSummary: string;
      suggestedHook: string;
      recommendedStyle: string;
      shots: ShotInput[];
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      plan = STUB_PLAN;
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a short-form video (TikTok, YouTube Shorts, travel reels) content strategist. Given the following project brief, output a JSON object only (no markdown, no explanation) with this exact structure:
{
  "goalSummary": "1-2 sentence summary of the video goal",
  "suggestedHook": "One concrete hook idea for the first 1-2 seconds",
  "recommendedStyle": "Brief style notes (pacing, tone, length)",
  "shots": [
    { "type": "must|nice|optional", "shotCategory": "hook_shot|establishing_shot|action_shots|detail_broll", "title": "Specific location-relevant suggestion", "description": "What to film" }
  ]
}
Include 5-8 shots. Prefer "must" for essential shots and "nice" or "optional" for extras.

CRITICAL for each shot: "title" must be a specific, location- and purpose-relevant suggestion, NOT the shot type name. Use the project location and video goal. Examples: for a cafe — hook_shot title could be "Coffee being poured" or "Restaurant sign"; establishing_shot could be "Wide of the cafe interior"; detail_broll could be "Pastry close-up". For a beach — hook_shot could be "Wave crashing" or "Feet in sand". Never use generic labels like "Hook shot" or "Establishing shot" as the title. "description" should say what to film for that moment.

Project brief:
- Location: ${project.location}
- Content type: ${project.contentType}
- Video goal: ${project.videoGoal}
- Audience: ${project.audience.join(", ")}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      if (!text) throw new Error("Empty response from Gemini");
      plan = parsePlanFromGemini(text);
    }

    await ctx.runMutation(api.projects.updatePlan, {
      projectId: args.projectId,
      goalSummary: plan.goalSummary,
      suggestedHook: plan.suggestedHook,
      recommendedStyle: plan.recommendedStyle,
    });

    await ctx.runMutation(api.shots.createFromPlan, {
      projectId: args.projectId,
      shots: plan.shots.map((s, i) => ({
        type: s.type,
        shotCategory: s.shotCategory ?? titleToCategory(s.title),
        title: s.title,
        description: s.description,
        order: i,
      })),
    });

    return { success: true };
  },
});

const STRONG_MOMENTS_PROMPT = `Watch this short video and list 2–5 strong moments that would work well for editing (e.g. hook, reaction, highlight, key moment). For each moment give the timestamp in seconds and a short reason (one phrase). Return JSON only, no markdown, no explanation: { "strongMoments": [ { "timestampSeconds": number, "reason": "string" } ] }.`;

export const analyzeVideoForStrongMoments = action({
  args: { shotId: v.id("shots") },
  handler: async (ctx, args) => {
    const shot = await ctx.runQuery(api.shots.getShot, {
      shotId: args.shotId,
    });
    if (!shot?.sceneStorageId) throw new Error("Shot has no video");
    const videoUrl = await ctx.runQuery(api.shots.getSceneUrl, {
      storageId: shot.sceneStorageId,
    });
    if (!videoUrl) throw new Error("Could not get video URL");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(api.shots.setStrongMoments, {
        shotId: args.shotId,
        strongMoments: [
          { timestampSeconds: 0, reason: "Analysis unavailable (no API key)" },
        ],
      });
      return { success: true };
    }
    const resp = await fetch(videoUrl);
    if (!resp.ok) throw new Error(`Failed to fetch video: ${resp.status}`);
    const buf = await resp.arrayBuffer();
    const maxBytes = 20 * 1024 * 1024;
    const bytes = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf;
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = (resp.headers.get("content-type") || "video/mp4").split(";")[0].trim();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType.startsWith("video/") ? mimeType : "video/mp4",
          data: base64,
        },
      },
      { text: STRONG_MOMENTS_PROMPT },
    ]);
    const text = result.response.text();
    if (!text) throw new Error("Empty response from Gemini");
    let jsonStr = text.trim();
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsed = JSON.parse(jsonStr) as { strongMoments?: { timestampSeconds?: number; reason?: string }[] };
    const list = Array.isArray(parsed.strongMoments)
      ? parsed.strongMoments
          .filter(
            (m): m is { timestampSeconds: number; reason: string } =>
              typeof m?.timestampSeconds === "number" && typeof m?.reason === "string"
          )
          .slice(0, 10)
      : [];
    await ctx.runMutation(api.shots.setStrongMoments, {
      shotId: args.shotId,
      strongMoments: list,
    });
    return { success: true };
  },
});

export const suggestVideoGoal = action({
  args: {
    location: v.string(),
    contentType: v.string(),
    audience: v.array(v.string()),
    creatorLevel: v.optional(v.string()),
    travelFocus: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const fallback =
      `Show ${args.location || "this spot"} in a ${args.contentType.replace("_", " ") || "short-form"} style for ${args.audience.length ? args.audience.join(" and ") : "viewers"}.`;
    if (!apiKey) {
      return { suggestions: [fallback] };
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a short-form video (TikTok, YouTube Shorts, travel) content strategist. Suggest 1-3 short video goal sentences (one sentence each) for a creator. Output JSON only: { "suggestions": ["sentence 1", "sentence 2"] }.
Location: ${args.location || "Not specified"}
Content type: ${args.contentType}
Audience: ${args.audience.join(", ") || "General"}
Creator level: ${args.creatorLevel || "Not specified"}
Travel focus: ${(args.travelFocus ?? []).join(", ") || "Not specified"}`;
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) return { suggestions: [fallback] };
      let jsonStr = text.trim();
      const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlock) jsonStr = codeBlock[1].trim();
      const parsed = JSON.parse(jsonStr) as { suggestions?: string[] };
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s): s is string => typeof s === "string").slice(0, 3)
        : [];
      return { suggestions: suggestions.length ? suggestions : [fallback] };
    } catch {
      return { suggestions: [fallback] };
    }
  },
});
