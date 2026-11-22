import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date.");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the HH:mm time format.");

const timezoneSchema = z
  .string()
  .trim()
  .min(2, "Timezone is required.")
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid IANA timezone, such as Asia/Kolkata.");

export const availabilityRuleSchema = z
  .object({
    weekday: z
      .number()
      .int()
      .min(1, "Monday is 1 and Sunday is 7.")
      .max(7, "Monday is 1 and Sunday is 7."),
    startLocalTime: timeSchema,
    endLocalTime: timeSchema,
    timezone: timezoneSchema,
    slotDurationMinutes: z.union([
      z.literal(30),
      z.literal(45),
      z.literal(60),
      z.literal(90),
    ]),
    effectiveFrom: isoDateSchema,
    effectiveUntil: isoDateSchema.nullable().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((value, context) => {
    if (value.endLocalTime <= value.startLocalTime) {
      context.addIssue({
        code: "custom",
        path: ["endLocalTime"],
        message: "End time must be after the start time.",
      });
      return;
    }

    if (value.effectiveUntil && value.effectiveUntil < value.effectiveFrom) {
      context.addIssue({
        code: "custom",
        path: ["effectiveUntil"],
        message: "The end date cannot be before the start date.",
      });
    }

    const [startHour, startMinute] = value.startLocalTime
      .split(":")
      .map(Number);
    const [endHour, endMinute] = value.endLocalTime.split(":").map(Number);
    const windowMinutes =
      endHour * 60 + endMinute - (startHour * 60 + startMinute);

    if (windowMinutes < value.slotDurationMinutes) {
      context.addIssue({
        code: "custom",
        path: ["slotDurationMinutes"],
        message: "The availability window must fit at least one slot.",
      });
    }
  });

export const replaceAvailabilityRulesSchema = z.object({
  rules: z
    .array(availabilityRuleSchema)
    .max(10, "Add at most 10 weekly availability windows."),
});

export const createAvailabilityExceptionSchema = z
  .object({
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    reason: z.string().trim().max(280).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date cannot be before the start date.",
      });
    }
  });

export const publicAvailabilityQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;
export type ReplaceAvailabilityRulesInput = z.infer<
  typeof replaceAvailabilityRulesSchema
>;
export type CreateAvailabilityExceptionInput = z.infer<
  typeof createAvailabilityExceptionSchema
>;
export type PublicAvailabilityQuery = z.infer<
  typeof publicAvailabilityQuerySchema
>;
