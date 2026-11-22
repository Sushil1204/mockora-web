import { z } from "zod";

export const mockPaymentResultSchema = z.object({
  outcome: z.enum(["SUCCESS", "FAILURE"]),
  failureReason: z.string().trim().max(500).optional(),
});

export type MockPaymentResultInput = z.infer<typeof mockPaymentResultSchema>;
