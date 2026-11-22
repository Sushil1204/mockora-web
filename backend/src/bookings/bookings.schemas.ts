import { z } from "zod";

const bookingStatusSchema = z.enum([
  "PENDING_EXPERT_APPROVAL",
  "APPROVED_PENDING_PAYMENT",
  "CONFIRMED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
  "IN_PROGRESS",
  "COMPLETED_PENDING_FEEDBACK",
  "COMPLETED",
]);

export const createBookingSchema = z.object({
  expertProfileId: z.string().uuid("Choose a valid expert."),
  startsAt: z.string().datetime({ offset: true }),
});

export const listBookingsQuerySchema = z.object({
  as: z.enum(["candidate", "expert"]).optional(),
  status: bookingStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const declineBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type DeclineBookingInput = z.infer<typeof declineBookingSchema>;
