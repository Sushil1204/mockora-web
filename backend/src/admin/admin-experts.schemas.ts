import { z } from "zod";

const verificationStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export const listApplicationsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(verificationStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const reviewApplicationSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be at most 2000 characters.")
    .optional(),
});

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;
