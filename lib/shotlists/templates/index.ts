import type { ShotlistTemplate } from "../types";

const CORE_STORY: ShotlistTemplate = {
  id: "core_story",
  category: "general",
  difficulty: "beginner",
  frequency: "very_high",
  name: "Core Story",
  description:
    "The essential sequence for any short-form story: hook, context, action, texture, and a clear end. Use this when you want a complete narrative in under 60 seconds.",
  shots: [
    {
      key: "hook",
      name: "Hook Shot",
      purpose: "Pattern interrupt — grab attention in the first 1–2 seconds.",
      required: true,
      shotCategory: "hook_shot",
      type: "must",
    },
    {
      key: "establishing",
      name: "Establishing Shot",
      purpose: "Set context — show where you are and the vibe.",
      required: true,
      shotCategory: "establishing_shot",
      type: "must",
    },
    {
      key: "action",
      name: "Action Shot(s)",
      purpose: "Main activity — show what’s happening.",
      required: true,
      repeatable: true,
      shotCategory: "action_shots",
      type: "must",
    },
    {
      key: "detail",
      name: "Detail / B-roll",
      purpose: "Texture and cutaways — close-ups that support the story.",
      required: true,
      repeatable: true,
      shotCategory: "detail_broll",
      type: "must",
    },
    {
      key: "closing",
      name: "Closing Shot",
      purpose: "Resolution or loop — land the ending or bring it full circle.",
      required: true,
      shotCategory: "action_shots",
      type: "must",
    },
  ],
};

const TALKING_BROLL: ShotlistTemplate = {
  id: "talking_broll",
  category: "education",
  difficulty: "beginner",
  frequency: "high",
  name: "Talking + B-Roll",
  description:
    "Best for tips, tutorials, and talking-head content. Structure your message with supporting visuals and clear cutaways for editing.",
  shots: [
    {
      key: "aroll",
      name: "A-roll Talking Head",
      purpose: "Main message — you on camera delivering the core content.",
      required: true,
      shotCategory: "establishing_shot",
      type: "must",
    },
    {
      key: "supporting",
      name: "Supporting B-roll",
      purpose: "Visual support — footage that illustrates what you’re saying.",
      required: false,
      repeatable: true,
      shotCategory: "detail_broll",
      type: "nice",
    },
    {
      key: "closeup",
      name: "Close-up Details",
      purpose: "Visual emphasis — tight shots for key points or products.",
      required: false,
      repeatable: true,
      shotCategory: "detail_broll",
      type: "nice",
    },
    {
      key: "cutaway",
      name: "Cutaway Transition",
      purpose: "Edit smoothing — short cutaways to hide jumps or add pace.",
      required: false,
      shotCategory: "detail_broll",
      type: "optional",
    },
    {
      key: "cta",
      name: "End CTA Shot",
      purpose: "Conversion — clear call to action or sign-off.",
      required: true,
      shotCategory: "action_shots",
      type: "must",
    },
  ],
};

const TRAVEL_COVERAGE: ShotlistTemplate = {
  id: "travel_coverage",
  category: "travel",
  difficulty: "beginner",
  frequency: "high",
  name: "Location / Travel Coverage",
  description:
    "Cover a place from arrival to exit. Great for vlogs, travel reels, and location-based content.",
  shots: [
    {
      key: "exterior",
      name: "Exterior Wide",
      purpose: "Set the scene — wide shot of the place from outside.",
      required: true,
      shotCategory: "establishing_shot",
      type: "must",
    },
    {
      key: "walkin",
      name: "Walk-in Shot",
      purpose: "Arrival — you or the camera moving into the space.",
      required: true,
      shotCategory: "action_shots",
      type: "must",
    },
    {
      key: "pan",
      name: "Environment Pan",
      purpose: "Sweep the space — slow pan to show the setting.",
      required: true,
      shotCategory: "action_shots",
      type: "must",
    },
    {
      key: "hero",
      name: "Hero Subject",
      purpose: "Main focus — the dish, view, or activity that’s the star.",
      required: true,
      shotCategory: "action_shots",
      type: "must",
    },
    {
      key: "details",
      name: "Detail Shots",
      purpose: "Texture — close-ups of food, decor, or small moments.",
      required: false,
      repeatable: true,
      shotCategory: "detail_broll",
      type: "nice",
    },
    {
      key: "reaction",
      name: "Reaction / Self Shot",
      purpose: "You in the moment — reaction or piece to camera.",
      required: true,
      shotCategory: "action_shots",
      type: "must",
    },
    {
      key: "exit",
      name: "Exit Shot",
      purpose: "Leave the viewer with a final beat — walking away or last look.",
      required: true,
      shotCategory: "action_shots",
      type: "must",
    },
  ],
};

const ALL_TEMPLATES: ShotlistTemplate[] = [
  CORE_STORY,
  TALKING_BROLL,
  TRAVEL_COVERAGE,
];

export function getAllTemplates(): ShotlistTemplate[] {
  return ALL_TEMPLATES;
}

export function getTemplateById(id: string): ShotlistTemplate | null {
  return ALL_TEMPLATES.find((t) => t.id === id) ?? null;
}

import type { ShotForCreate } from "../types";

export type { ShotForCreate } from "../types";

/**
 * Converts a template into the shot array shape for createFromPlan.
 * One row per template shot (repeatable shots appear once; duplicate in UI if we want multiple later).
 */
export function templateToShotsForCreate(
  template: ShotlistTemplate
): ShotForCreate[] {
  return template.shots.map((s, i) => ({
    type: s.type,
    shotCategory: s.shotCategory,
    title: s.name,
    description: s.purpose,
    order: i,
    purpose: s.purpose,
  }));
}

export { CORE_STORY, TALKING_BROLL, TRAVEL_COVERAGE };
