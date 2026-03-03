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
      title: "Establishing shot",
      description: "Wide shot of the location to set the scene.",
    },
    {
      type: "must" as const,
      shotCategory: "detail_broll" as ShotCategory,
      title: "Detail or product",
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
    { "type": "must|nice|optional", "title": "Short title", "description": "What to film" }
  ]
}
Include 5-8 shots. Prefer "must" for essential shots and "nice" or "optional" for extras.

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
