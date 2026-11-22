import { z } from "zod";

const uuidSchema = z.string().uuid("Select a valid option.");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date.");

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

const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, "Use a two-letter country code.")
  .transform((value) => value.toUpperCase());

const languageCodeSchema = z
  .string()
  .trim()
  .min(2, "Language codes must be at least 2 characters.")
  .max(16)
  .regex(
    /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/,
    "Use a language code such as en or pt-BR.",
  );

export const expertExperienceSchema = z
  .object({
    company: z
      .string()
      .trim()
      .min(2, "Company is required.")
      .max(150, "Company must be at most 150 characters."),
    designation: z
      .string()
      .trim()
      .min(2, "Designation is required.")
      .max(150, "Designation must be at most 150 characters."),
    startDate: isoDateSchema,
    endDate: isoDateSchema.nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (value) =>
      !value.endDate ||
      new Date(`${value.endDate}T00:00:00.000Z`) >=
        new Date(`${value.startDate}T00:00:00.000Z`),
    {
      message: "End date cannot be before the start date.",
      path: ["endDate"],
    },
  );

export const updateExpertApplicationSchema = z
  .object({
    professionalHeadline: z
      .string()
      .trim()
      .min(5, "Headline must be at least 5 characters.")
      .max(150, "Headline must be at most 150 characters.")
      .optional(),
    currentDesignation: z
      .string()
      .trim()
      .min(2, "Current designation is required.")
      .max(150)
      .optional(),
    currentCompany: z
      .string()
      .trim()
      .min(2, "Current company is required.")
      .max(150)
      .optional(),
    countryCode: countryCodeSchema.optional(),
    timezone: timezoneSchema.optional(),
    linkedinUrl: z
      .string()
      .trim()
      .url("Enter a valid LinkedIn URL.")
      .max(2048)
      .nullable()
      .optional(),
    introduction: z
      .string()
      .trim()
      .min(20, "Introduction must be at least 20 characters.")
      .max(3000, "Introduction must be at most 3000 characters.")
      .optional(),
    yearsExperience: z
      .number()
      .int("Years of experience must be a whole number.")
      .min(0, "Years of experience cannot be negative.")
      .max(60, "Years of experience must be 60 or fewer.")
      .optional(),
    industryIds: z.array(uuidSchema).max(10).optional(),
    specializationIds: z.array(uuidSchema).max(20).optional(),
    interviewTypeIds: z.array(uuidSchema).max(10).optional(),
    jobRoleIds: z.array(uuidSchema).max(20).optional(),
    candidateLevelIds: z.array(uuidSchema).max(10).optional(),
    languageCodes: z.array(languageCodeSchema).max(10).optional(),
    experiences: z.array(expertExperienceSchema).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export type ExpertExperienceInput = z.infer<typeof expertExperienceSchema>;
export type UpdateExpertApplicationInput = z.infer<
  typeof updateExpertApplicationSchema
>;
