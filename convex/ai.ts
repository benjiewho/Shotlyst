"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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
      purpose: "Set context so viewers know where we are.",
    },
    {
      type: "must" as const,
      shotCategory: "detail_broll" as ShotCategory,
      title: "Key detail or product close-up",
      description: "Close-up of a key element (dish, view, or activity).",
      purpose: "Add texture and a moment to lean in.",
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
  purpose?: string;
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
    shots?: { type?: string; title?: string; description?: string; purpose?: string }[];
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
    const purpose = typeof (s as { purpose?: string }).purpose === "string" ? (s as { purpose: string }).purpose : undefined;
    return {
      type: (s.type === "optional" || s.type === "nice" ? s.type : "must") as
        | "must"
        | "nice"
        | "optional",
      shotCategory,
      title,
      description:
        typeof s.description === "string" ? s.description : "No description.",
      purpose,
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
    let planSource: "stub" | "gemini" = "stub";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      plan = STUB_PLAN;
    } else {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const contentTypeHint =
          project.contentType === "travel_diary"
            ? "Subject: destination vibe, personal moments, atmosphere."
            : project.contentType === "tiktok"
              ? "Subject: hook first, trend-aware, punchy."
              : "Subject: hook in first 3s, clear beats, CTA.";
        const audienceLine = `Audience: ${project.audience.join(", ")} — aim for clear value and watchability.`;
        const platformLine =
          project.contentType === "tiktok"
            ? "Platform: TikTok — hook in first 1–2 seconds, vertical, quick cuts."
            : project.contentType === "youtube_short"
              ? "Platform: YouTube Shorts — hook in first 3 seconds, clear structure, CTA."
              : "Platform: Travel — location reveal, cultural detail, personal moment, atmosphere.";

        const prompt = `You are a pragmatic director for everyday creators. Output only valid JSON; no markdown or commentary.

CONTENT: ${contentTypeHint} ${audienceLine}
${platformLine}

SCENE STRATEGY (use these categories):
- hook_shot: immediate value, curiosity, pattern interrupt.
- establishing_shot: context, environment, wide.
- action_shots: movement, result, energy, climax.
- detail_broll: close-ups, texture, cutaways, coverage.

SPECIFICITY: Avoid generic descriptions. Be concrete and shootable. For each shot, "title" must be a specific, location- and purpose-relevant suggestion (e.g. "Coffee being poured", "Wide of the cafe interior", "Pastry close-up") — never the category name. In "description" include one concrete cue when helpful: angle (overhead, eye-level), movement (slow pan, static), or moment (pour, first bite).

VARIETY: Vary shots — if one is wide and static, next can be closer or with movement. Mix pacing.
ORDER: Hook → establishing → main action/beats → detail/b-roll → closing/CTA if needed. Include 5–8 shots (hard cap 10). Prefer "must" for essential shots, "nice" or "optional" for extras.

Output a JSON object with this exact structure:
{
  "goalSummary": "1-2 sentence summary of the video goal",
  "suggestedHook": "One concrete hook idea for the first 1-2 seconds",
  "recommendedStyle": "Brief style notes (pacing, tone, length)",
  "shots": [
    { "type": "must|nice|optional", "shotCategory": "hook_shot|establishing_shot|action_shots|detail_broll", "title": "Specific location-relevant suggestion", "description": "What to film; optional concrete cue", "purpose": "Optional one-line why this shot" }
  ]
}

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
        planSource = "gemini";
      } catch (e) {
        plan = STUB_PLAN;
        console.warn(
          "Gemini plan generation failed, using stub:",
          e instanceof Error ? e.message : String(e)
        );
      }
    }

    await ctx.runMutation(api.projects.updatePlan, {
      projectId: args.projectId,
      goalSummary: plan.goalSummary,
      suggestedHook: plan.suggestedHook,
      recommendedStyle: plan.recommendedStyle,
      planSource,
    });

    await ctx.runMutation(api.shots.createFromPlan, {
      projectId: args.projectId,
      shots: plan.shots.map((s, i) => ({
        type: s.type,
        shotCategory: s.shotCategory ?? titleToCategory(s.title),
        title: s.title,
        description: s.description,
        order: i,
        ...(s.purpose !== undefined && s.purpose !== "" ? { purpose: s.purpose } : {}),
      })),
    });

    return { success: true };
  },
});

function buildCombinedAnalysisPrompt(goal: string, shotTitle: string, shotDescription: string): string {
  return `Watch this short video and analyze it in two ways. Return a single JSON object only, no markdown, no explanation.

1) Strong moments: List 2–5 strong moments that would work well for editing (e.g. hook, reaction, highlight, key moment). For each give timestamp in seconds and a short reason (one phrase).
2) Scene feedback: The project goal is: "${goal}". This scene is titled "${shotTitle}" and should show: ${shotDescription}. Provide how well the video aligns, plus brief pros and cons.

Return JSON in this exact shape:
{
  "strongMoments": [ { "timestampSeconds": number, "reason": "string" } ],
  "sceneFeedback": {
    "alignmentSummary": "string (1–2 sentences)",
    "pros": ["string"],
    "cons": ["string"]
  }
}`;
}

export const analyzeVideoForStrongMoments = action({
  args: { shotId: v.id("shots") },
  handler: async (ctx, args) => {
    const shot = await ctx.runQuery(api.shots.getShot, { shotId: args.shotId });
    if (!shot?.sceneStorageId) throw new Error("Shot has no video");
    const project = await ctx.runQuery(api.projects.get, { id: shot.projectId });
    if (!project) throw new Error("Project not found");
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
      await ctx.runMutation(api.shots.setSceneFeedback, {
        shotId: args.shotId,
        sceneFeedback: {
          alignmentSummary: "AI feedback unavailable (no API key configured).",
          pros: [],
          cons: [],
        },
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
    const prompt = buildCombinedAnalysisPrompt(
      project.goalSummary,
      shot.title,
      shot.description
    );
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType.startsWith("video/") ? mimeType : "video/mp4",
          data: base64,
        },
      },
      { text: prompt },
    ]);
    const text = result.response.text();
    if (!text) throw new Error("Empty response from Gemini");
    let jsonStr = text.trim();
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsed = JSON.parse(jsonStr) as {
      strongMoments?: { timestampSeconds?: number; reason?: string }[];
      sceneFeedback?: {
        alignmentSummary?: string;
        pros?: string[];
        cons?: string[];
      };
    };
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
    const sf = parsed.sceneFeedback;
    const alignmentSummary =
      typeof sf?.alignmentSummary === "string" ? sf.alignmentSummary : "Analysis unavailable.";
    const pros = Array.isArray(sf?.pros)
      ? sf.pros.filter((p): p is string => typeof p === "string").slice(0, 5)
      : [];
    const cons = Array.isArray(sf?.cons)
      ? sf.cons.filter((c): c is string => typeof c === "string").slice(0, 5)
      : [];
    await ctx.runMutation(api.shots.setSceneFeedback, {
      shotId: args.shotId,
      sceneFeedback: { alignmentSummary, pros, cons },
    });
    return { success: true };
  },
});

function buildPlanContext(project: { goalSummary: string; suggestedHook: string; recommendedStyle: string; location: string; contentType: string; videoGoal: string; audience: string[] }, shots: { order: number; title: string; description: string; shotCategory?: string }[]): string {
  const shotLines = shots
    .sort((a, b) => a.order - b.order)
    .map((s, i) => `${i + 1}. ${s.title} (${s.shotCategory ?? "—"}) — ${s.description}`)
    .join("\n");
  return `Goal: ${project.goalSummary}
Suggested hook: ${project.suggestedHook}
Recommended style: ${project.recommendedStyle}
Location: ${project.location}
Content type: ${project.contentType}
Video goal: ${project.videoGoal}
Audience: ${project.audience.join(", ")}

Shot list:
${shotLines}`;
}

export const regenerateHook = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(api.projects.get, { id: args.projectId });
    if (!project) throw new Error("Project not found");
    const shots = await ctx.runQuery(api.shots.listByProject, { projectId: args.projectId });
    const context = buildPlanContext(project, shots);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false };
    }
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `Given this plan:\n\n${context}\n\nGenerate only a new suggested hook (1-2 sentences) for the first 1-2 seconds of the video. Reply with only the hook text, no labels or quotes.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim() ?? "";
      if (!text) return { success: false };
      const clean = text.replace(/^["']|["']$/g, "");
      await ctx.runMutation(api.projects.updatePlanFields, {
        projectId: args.projectId,
        suggestedHook: clean,
      });
      return { success: true };
    } catch (e) {
      console.warn("regenerateHook failed:", e instanceof Error ? e.message : String(e));
      return { success: false };
    }
  },
});

export const regenerateStyle = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(api.projects.get, { id: args.projectId });
    if (!project) throw new Error("Project not found");
    const shots = await ctx.runQuery(api.shots.listByProject, { projectId: args.projectId });
    const context = buildPlanContext(project, shots);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false };
    }
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `Given this plan:\n\n${context}\n\nGenerate only new recommended style notes (pacing, tone, length, duration). Reply with only the style text, no labels or quotes.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim() ?? "";
      if (!text) return { success: false };
      const clean = text.replace(/^["']|["']$/g, "");
      await ctx.runMutation(api.projects.updatePlanFields, {
        projectId: args.projectId,
        recommendedStyle: clean,
      });
      return { success: true };
    } catch (e) {
      console.warn("regenerateStyle failed:", e instanceof Error ? e.message : String(e));
      return { success: false };
    }
  },
});

