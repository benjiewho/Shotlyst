import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const shotStatus = v.union(
  v.literal("pending"),
  v.literal("captured"),
  v.literal("skipped")
);

const shotType = v.union(
  v.literal("must"),
  v.literal("nice"),
  v.literal("optional")
);

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) return [];
    const shots = await ctx.db
      .query("shots")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .collect();
    return shots.sort((a, b) => a.order - b.order);
  },
});

export const createFromPlan = mutation({
  args: {
    projectId: v.id("projects"),
    shots: v.array(
      v.object({
        type: shotType,
        title: v.string(),
        description: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    const ids = [];
    for (const s of args.shots) {
      const id = await ctx.db.insert("shots", {
        projectId: args.projectId,
        type: s.type,
        title: s.title,
        description: s.description,
        order: s.order,
        status: "pending",
      });
      ids.push(id);
    }
    return ids;
  },
});

export const updateStatus = mutation({
  args: {
    shotId: v.id("shots"),
    status: shotStatus,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const shot = await ctx.db.get(args.shotId);
    if (!shot) throw new Error("Shot not found");
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.shotId, { status: args.status });
    return args.shotId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const linkScene = mutation({
  args: {
    shotId: v.id("shots"),
    storageId: v.id("_storage"),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const shot = await ctx.db.get(args.shotId);
    if (!shot) throw new Error("Shot not found");
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.shotId, {
      sceneStorageId: args.storageId,
      sceneDuration: args.duration,
      status: "captured",
    });
    return args.shotId;
  },
});
