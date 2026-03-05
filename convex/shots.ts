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

const shotCategory = v.union(
  v.literal("hook_shot"),
  v.literal("establishing_shot"),
  v.literal("action_shots"),
  v.literal("detail_broll")
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

export const getSceneUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const shot = await ctx.db
      .query("shots")
      .withIndex("by_scene_storage_id", (q) => q.eq("sceneStorageId", args.storageId))
      .first();
    if (!shot) return null;
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getShot = query({
  args: { shotId: v.id("shots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const shot = await ctx.db.get(args.shotId);
    if (!shot) return null;
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) return null;
    return shot;
  },
});

export const createFromPlan = mutation({
  args: {
    projectId: v.id("projects"),
    shots: v.array(
      v.object({
        type: shotType,
        shotCategory: v.optional(shotCategory),
        title: v.string(),
        description: v.string(),
        order: v.number(),
        purpose: v.optional(v.string()),
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
        shotCategory: s.shotCategory,
        title: s.title,
        description: s.description,
        purpose: s.purpose,
        order: s.order,
        status: "pending",
      });
      ids.push(id);
    }
    return ids;
  },
});

export const updateShot = mutation({
  args: {
    shotId: v.id("shots"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(shotType),
    shotCategory: v.optional(shotCategory),
    purpose: v.optional(v.string()),
    sceneNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const shot = await ctx.db.get(args.shotId);
    if (!shot) throw new Error("Shot not found");
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");
    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.type !== undefined) updates.type = args.type;
    if (args.shotCategory !== undefined) updates.shotCategory = args.shotCategory;
    if (args.purpose !== undefined) updates.purpose = args.purpose;
    if (args.sceneNotes !== undefined) updates.sceneNotes = args.sceneNotes;
    if (Object.keys(updates).length > 0) await ctx.db.patch(args.shotId, updates);
    return args.shotId;
  },
});

export const remove = mutation({
  args: { shotId: v.id("shots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const shot = await ctx.db.get(args.shotId);
    if (!shot) throw new Error("Shot not found");
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");
    const mediaRows = await ctx.db
      .query("media")
      .withIndex("by_shot_id", (q) => q.eq("shotId", args.shotId))
      .collect();
    for (const row of mediaRows) {
      await ctx.storage.delete(row.storageId);
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(args.shotId);
    return args.shotId;
  },
});

export const reorderShots = mutation({
  args: {
    projectId: v.id("projects"),
    shotIds: v.array(v.id("shots")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found or unauthorized");
    for (let i = 0; i < args.shotIds.length; i++) {
      const shot = await ctx.db.get(args.shotIds[i]);
      if (!shot || shot.projectId !== args.projectId) throw new Error("Shot not found or wrong project");
      await ctx.db.patch(args.shotIds[i], { order: i });
    }
    return undefined;
  },
});

export const createOne = mutation({
  args: {
    projectId: v.id("projects"),
    type: shotType,
    shotCategory: v.optional(shotCategory),
    title: v.string(),
    description: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    return await ctx.db.insert("shots", {
      projectId: args.projectId,
      type: args.type,
      shotCategory: args.shotCategory,
      title: args.title,
      description: args.description,
      order: args.order,
      status: "pending",
    });
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

export const unassignShot = mutation({
  args: { shotId: v.id("shots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const shot = await ctx.db.get(args.shotId);
    if (!shot) throw new Error("Shot not found");
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.shotId, {
      sceneStorageId: undefined,
      sceneDuration: undefined,
      strongMoments: undefined,
      sceneFeedback: undefined,
      status: "pending",
    });
    return args.shotId;
  },
});

const strongMomentValidator = v.object({
  timestampSeconds: v.number(),
  reason: v.string(),
});

export const setStrongMoments = mutation({
  args: {
    shotId: v.id("shots"),
    strongMoments: v.array(strongMomentValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const shot = await ctx.db.get(args.shotId);
    if (!shot) throw new Error("Shot not found");
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.shotId, { strongMoments: args.strongMoments });
    return args.shotId;
  },
});

const sceneFeedbackValidator = v.object({
  alignmentSummary: v.string(),
  pros: v.array(v.string()),
  cons: v.array(v.string()),
});

export const setSceneFeedback = mutation({
  args: {
    shotId: v.id("shots"),
    sceneFeedback: sceneFeedbackValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const shot = await ctx.db.get(args.shotId);
    if (!shot) throw new Error("Shot not found");
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.shotId, { sceneFeedback: args.sceneFeedback });
    return args.shotId;
  },
});
