import { z } from "zod";

const uuidSchema = z.string().uuid("Select a valid option.");

export const listExpertsQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Enter a search term.")
    .max(100, "Search terms must be at most 100 characters.")
    .optional(),
  industryId: uuidSchema.optional(),
  specializationId: uuidSchema.optional(),
  interviewTypeId: uuidSchema.optional(),
  jobRoleId: uuidSchema.optional(),
  levelId: uuidSchema.optional(),
  language: z
    .string()
    .trim()
    .min(2, "Language codes must be at least 2 characters.")
    .max(16)
    .transform((value) => value.toLowerCase())
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export type ListExpertsQuery = z.infer<typeof listExpertsQuerySchema>;
