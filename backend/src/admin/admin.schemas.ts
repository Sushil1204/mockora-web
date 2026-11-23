import { z } from "zod";

const accountStatuses = ["ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;
const bookingStatuses = [
  "PENDING_EXPERT_APPROVAL",
  "APPROVED_PENDING_PAYMENT",
  "CONFIRMED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
  "IN_PROGRESS",
  "COMPLETED_PENDING_FEEDBACK",
  "COMPLETED",
] as const;
const paymentStatuses = [
  "CREATED",
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
] as const;
const paymentProviders = ["MOCK", "RAZORPAY"] as const;
const payoutStatuses = [
  "PENDING",
  "ELIGIBLE",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REVERSED",
] as const;

const search = z.string().trim().min(1).max(120).optional();
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(20);

const paginationQuery = z.object({ page, limit });

export const listCandidatesQuerySchema = paginationQuery.extend({
  q: search,
  status: z.enum(accountStatuses).optional(),
});

export const adminReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Provide a short reason for this action.")
    .max(500, "The reason must be at most 500 characters."),
});

export const listAdminBookingsQuerySchema = paginationQuery.extend({
  q: search,
  status: z.enum(bookingStatuses).optional(),
});

export const adminCancelBookingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Explain why this booking is being cancelled.")
    .max(500, "The reason must be at most 500 characters."),
  refundAmount: z.coerce.number().int().min(0).default(0),
});

export const listAdminPaymentsQuerySchema = paginationQuery.extend({
  q: search,
  status: z.enum(paymentStatuses).optional(),
  provider: z.enum(paymentProviders).optional(),
});

export const listAdminRefundsQuerySchema = paginationQuery.extend({
  q: search,
});

export const listAdminPayoutsQuerySchema = paginationQuery.extend({
  q: search,
  status: z.enum(payoutStatuses).optional(),
});

export const markPayoutPaidSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, "The note must be at most 500 characters.")
    .optional(),
});

const pricingRuleFields = {
  durationMinutes: z.coerce
    .number()
    .int()
    .min(15, "Sessions must be at least 15 minutes.")
    .max(240, "Sessions must be at most 240 minutes."),
  candidatePriceAmount: z.coerce
    .number()
    .int()
    .min(1, "The candidate price must be greater than zero.")
    .max(10_000_000),
  expertPayoutAmount: z.coerce.number().int().min(0).max(10_000_000),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a three-letter currency code.")
    .default("INR"),
  effectiveFrom: z.string().datetime({ offset: true }).optional(),
  effectiveUntil: z.string().datetime({ offset: true }).nullable().optional(),
};

export const createPricingRuleSchema = z
  .object({
    ...pricingRuleFields,
    isActive: z.boolean().default(true),
  })
  .refine(
    (rule) => rule.expertPayoutAmount < rule.candidatePriceAmount,
    "The expert payout must be lower than the candidate price.",
  )
  .refine(
    (rule) =>
      !rule.effectiveUntil ||
      !rule.effectiveFrom ||
      new Date(rule.effectiveUntil) > new Date(rule.effectiveFrom),
    "The effective end must be after the start.",
  );

export const updatePricingRuleSchema = z
  .object({
    durationMinutes: pricingRuleFields.durationMinutes.optional(),
    candidatePriceAmount: pricingRuleFields.candidatePriceAmount.optional(),
    expertPayoutAmount: pricingRuleFields.expertPayoutAmount.optional(),
    currency: pricingRuleFields.currency.optional(),
    effectiveFrom: pricingRuleFields.effectiveFrom,
    effectiveUntil: pricingRuleFields.effectiveUntil,
    isActive: z.boolean().optional(),
  })
  .refine(
    (rule) =>
      rule.candidatePriceAmount === undefined ||
      rule.expertPayoutAmount === undefined ||
      rule.expertPayoutAmount < rule.candidatePriceAmount,
    "The expert payout must be lower than the candidate price.",
  );

export const listPricingRulesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});

export const listAdminFeedbackQuerySchema = paginationQuery.extend({
  q: search,
  expertId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
});

export const listAuditLogsQuerySchema = paginationQuery.extend({
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(80).optional(),
  actorId: z.string().uuid().optional(),
});

export type ListCandidatesQuery = z.infer<typeof listCandidatesQuerySchema>;
export type AdminReasonInput = z.infer<typeof adminReasonSchema>;
export type ListAdminBookingsQuery = z.infer<
  typeof listAdminBookingsQuerySchema
>;
export type AdminCancelBookingInput = z.infer<typeof adminCancelBookingSchema>;
export type ListAdminPaymentsQuery = z.infer<
  typeof listAdminPaymentsQuerySchema
>;
export type ListAdminRefundsQuery = z.infer<typeof listAdminRefundsQuerySchema>;
export type ListAdminPayoutsQuery = z.infer<typeof listAdminPayoutsQuerySchema>;
export type MarkPayoutPaidInput = z.infer<typeof markPayoutPaidSchema>;
export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;
export type ListPricingRulesQuery = z.infer<typeof listPricingRulesQuerySchema>;
export type ListAdminFeedbackQuery = z.infer<
  typeof listAdminFeedbackQuerySchema
>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
