import { z } from "zod";

export const CAREER_STAGES = [
  "STUDENT",
  "FRESHER",
  "EARLY_CAREER",
  "MID_CAREER",
  "SENIOR",
  "CAREER_SWITCHER",
] as const;

export const CANDIDATE_GOALS = [
  "TECHNICAL_KNOWLEDGE",
  "COMMUNICATION",
  "PROBLEM_SOLVING",
  "CONFIDENCE",
  "BEHAVIORAL",
  "LEADERSHIP",
  "OVERALL_PREPARATION",
] as const;

const uuidSchema = z.string().uuid("Select a valid option.");

export const updateCandidateProfileSchema = z
  .object({
    careerStage: z.enum(CAREER_STAGES).optional(),
    industryId: uuidSchema.optional(),
    currentRoleId: uuidSchema.optional(),
    targetRoleId: uuidSchema.optional(),
    yearsExperience: z
      .number()
      .int("Years of experience must be a whole number.")
      .min(0, "Years of experience cannot be negative.")
      .max(60, "Years of experience must be 60 or fewer.")
      .optional(),
    targetLevelId: uuidSchema.optional(),
    goals: z
      .array(z.enum(CANDIDATE_GOALS))
      .min(1, "Select at least one preparation goal.")
      .max(CANDIDATE_GOALS.length)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export type UpdateCandidateProfileInput = z.infer<
  typeof updateCandidateProfileSchema
>;
