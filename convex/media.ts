import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const saveToLibrary = mutation({
  args: {
    projectId: v.id("projects"),
    shotId: v.id("shots"),
    storageId: v.id("_storage"),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    const shot = await ctx.db.get(args.shotId);
    if (!shot || shot.projectId !== args.projectId) throw new Error("Shot not found");
    const existing = await ctx.db
      .query("media")
      .withIndex("by_shot_id", (q) => q.eq("shotId", args.shotId))
      .collect();
    if (existing.length >= 2) {
      throw new Error("This scene can have at most 2 videos. Remove one to add another.");
    }
    const now = Date.now();
    return await ctx.db.insert("media", {
      userId,
      projectId: args.projectId,
      shotId: args.shotId,
      storageId: args.storageId,
      duration: args.duration,
      createdAt: now,
    });
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("media")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listLibrary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const mediaList = await ctx.db
      .query("media")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const projectIds = [...new Set(mediaList.map((m) => m.projectId))];
    const result = [];
    for (const projectId of projectIds) {
      const project = await ctx.db.get(projectId);
      if (!project || project.userId !== userId) continue;
      const shots = await ctx.db
        .query("shots")
        .withIndex("by_project_id", (q) => q.eq("projectId", projectId))
        .collect();
      shots.sort((a, b) => a.order - b.order);
      result.push({
        projectId,
        projectName: project.name,
        shots: shots.map((shot) => ({
          shotId: shot._id,
          shotTitle: shot.title,
          order: shot.order,
          assignedStorageId: shot.sceneStorageId ?? null,
          media: mediaList
            .filter((m) => m.shotId === shot._id)
            .map((m) => ({ mediaId: m._id, storageId: m.storageId, duration: m.duration, createdAt: m.createdAt })),
        })),
      });
    }
    return result;
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) return [];
    return await ctx.db
      .query("media")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const listByShot = query({
  args: { shotId: v.id("shots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const shot = await ctx.db.get(args.shotId);
    if (!shot) return [];
    const project = await ctx.db.get(shot.projectId);
    if (!project || project.userId !== userId) return [];
    return await ctx.db
      .query("media")
      .withIndex("by_shot_id", (q) => q.eq("shotId", args.shotId))
      .order("desc")
      .collect();
  },
});

export const remove = mutation({
  args: { mediaId: v.id("media") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const row = await ctx.db.get(args.mediaId);
    if (!row || row.userId !== userId) throw new Error("Media not found");
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete(args.mediaId);
    return args.mediaId;
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("media")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
    if (!row || row.userId !== userId) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});
