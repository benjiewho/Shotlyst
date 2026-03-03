import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

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

const contentType = v.union(
  v.literal("tiktok"),
  v.literal("youtube_short"),
  v.literal("travel_diary")
);

const projectStatus = v.union(
  v.literal("planning"),
  v.literal("capturing"),
  v.literal("reviewing"),
  v.literal("complete")
);

const shotType = v.union(
  v.literal("must"),
  v.literal("nice"),
  v.literal("optional")
);

const shotStatus = v.union(
  v.literal("pending"),
  v.literal("captured"),
  v.literal("skipped")
);

const shotCategory = v.union(
  v.literal("hook_shot"),
  v.literal("establishing_shot"),
  v.literal("action_shots"),
  v.literal("detail_broll")
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    creatorLevel: v.optional(creatorLevel),
    primaryPlatform: v.optional(primaryPlatform),
    travelFocus: v.optional(v.array(v.string())),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    location: v.string(),
    contentType,
    videoGoal: v.string(),
    audience: v.array(v.string()),
    status: projectStatus,
    planGenerated: v.boolean(),
    goalSummary: v.string(),
    suggestedHook: v.string(),
    recommendedStyle: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  shots: defineTable({
    projectId: v.id("projects"),
    type: shotType,
    shotCategory: v.optional(shotCategory),
    title: v.string(),
    description: v.string(),
    status: shotStatus,
    order: v.number(),
    sceneStorageId: v.optional(v.id("_storage")),
    sceneDuration: v.optional(v.number()),
    sceneNotes: v.optional(v.string()),
  }).index("by_project_id", ["projectId"]),

  reflections: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
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
    createdAt: v.number(),
  }).index("by_project_id", ["projectId"]),
});
