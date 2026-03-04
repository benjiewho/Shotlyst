import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// NOTE: getByProject is currently unused by the frontend. It is expected to be
// needed when "view existing reflection" or "edit reflection" features are added.
// Do not delete without checking product roadmap.
export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) return null;
    const reflection = await ctx.db
      .query("reflections")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .first();
    return reflection;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    overallFeeling: v.number(),
    goalAlignment: v.number(),
    sceneRatings: v.array(
      v.object({
        shotId: v.id("shots"),
        rating: v.number(),
      })
    ),
    aiHelpfulness: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    const now = Date.now();
    return await ctx.db.insert("reflections", {
      projectId: args.projectId,
      userId,
      overallFeeling: args.overallFeeling,
      goalAlignment: args.goalAlignment,
      sceneRatings: args.sceneRatings,
      aiHelpfulness: args.aiHelpfulness,
      notes: args.notes,
      createdAt: now,
    });
  },
});
