import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const contentType = v.union(
  v.literal("tiktok"),
  v.literal("youtube_short"),
  v.literal("travel_diary")
);

export const listWithProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const result = [];
    for (const project of projects) {
      const shots = await ctx.db
        .query("shots")
        .withIndex("by_project_id", (q) => q.eq("projectId", project._id))
        .collect();
      const totalShots = shots.length;
      const capturedCount = shots.filter((s) => s.status === "captured").length;
      result.push({ project, capturedCount, totalShots });
    }
    return result;
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) return null;
    return project;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    contentType,
    videoGoal: v.string(),
    audience: v.array(v.string()),
    // DEPRECATED: templateId is no longer used by any frontend flow (AI-only).
    // Kept optional for backward compatibility. Safe to remove after confirming
    // no production data relies on it.
    templateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    return await ctx.db.insert("projects", {
      userId,
      name: args.name,
      location: args.location,
      contentType: args.contentType,
      videoGoal: args.videoGoal,
      audience: args.audience,
      templateId: args.templateId,
      status: "planning",
      planGenerated: false,
      goalSummary: "",
      suggestedHook: "",
      recommendedStyle: "",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePlan = mutation({
  args: {
    projectId: v.id("projects"),
    goalSummary: v.string(),
    suggestedHook: v.string(),
    recommendedStyle: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    const now = Date.now();
    await ctx.db.patch(args.projectId, {
      goalSummary: args.goalSummary,
      suggestedHook: args.suggestedHook,
      recommendedStyle: args.recommendedStyle,
      planGenerated: true,
      status: "capturing",
      updatedAt: now,
    });
    return args.projectId;
  },
});

export const updatePlanFields = mutation({
  args: {
    projectId: v.id("projects"),
    goalSummary: v.optional(v.string()),
    suggestedHook: v.optional(v.string()),
    recommendedStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.goalSummary !== undefined) updates.goalSummary = args.goalSummary;
    if (args.suggestedHook !== undefined) updates.suggestedHook = args.suggestedHook;
    if (args.recommendedStyle !== undefined) updates.recommendedStyle = args.recommendedStyle;
    await ctx.db.patch(args.projectId, updates);
    return args.projectId;
  },
});

export const updateStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("planning"),
      v.literal("capturing"),
      v.literal("reviewing"),
      v.literal("complete")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    await ctx.db.patch(args.projectId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return args.projectId;
  },
});

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    const shots = await ctx.db
      .query("shots")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .collect();
    const mediaRows = await ctx.db
      .query("media")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const row of mediaRows) {
      await ctx.storage.delete(row.storageId);
      await ctx.db.delete(row._id);
    }
    for (const shot of shots) {
      await ctx.db.delete(shot._id);
    }
    const reflections = await ctx.db
      .query("reflections")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const r of reflections) {
      await ctx.db.delete(r._id);
    }
    await ctx.db.delete(args.projectId);
    return args.projectId;
  },
});
