/**
 * Shotlist template system — shared types.
 * Templates are data-driven; UI reads from these definitions.
 */

export type ShotType = "must" | "nice" | "optional";

export type ShotCategory =
  | "hook_shot"
  | "establishing_shot"
  | "action_shots"
  | "detail_broll";

export type TemplateCategory = "general" | "education" | "travel";

export type TemplateDifficulty = "beginner" | "growing" | "experienced";

export type TemplateFrequency = "very_high" | "high" | "medium" | "low";

export interface TemplateShot {
  key: string;
  name: string;
  purpose: string;
  required: boolean;
  repeatable?: boolean;
  shotCategory: ShotCategory;
  type: ShotType;
}

export interface ShotlistTemplate {
  id: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  frequency: TemplateFrequency;
  name: string;
  description: string;
  shots: TemplateShot[];
}

/** Shape passed to Convex createFromPlan (and optional purpose for future use). */
export interface ShotForCreate {
  type: ShotType;
  shotCategory?: ShotCategory;
  title: string;
  description: string;
  order: number;
  purpose?: string;
}
