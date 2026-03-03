import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const creatorLevel = v.union(
  v.literal("beginner"),
  v.literal("growing"),
  v.literal("experienced")
);
const primaryPlatform = v.union(
  v.literal("tiktok"),
  v.literal("youtube"),
  v.literal("instagram")
);

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    creatorLevel: v.optional(creatorLevel),
    primaryPlatform: v.optional(primaryPlatform),
    travelFocus: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const updates: Record<string, unknown> = {};
    if (args.creatorLevel !== undefined) updates.creatorLevel = args.creatorLevel;
    if (args.primaryPlatform !== undefined) updates.primaryPlatform = args.primaryPlatform;
    if (args.travelFocus !== undefined) updates.travelFocus = args.travelFocus;
    if (Object.keys(updates).length === 0) return userId;
    await ctx.db.patch(userId, updates);
    return userId;
  },
});
