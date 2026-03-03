import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const contentType = v.union(
  v.literal("tiktok"),
  v.literal("youtube_short"),
  v.literal("travel_diary")
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("projects")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

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
