import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(320, "Email is too long.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(72, "Password must be at most 72 characters.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be at most 100 characters."),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(72),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(100, "Name must be at most 100 characters.")
      .optional(),
    avatarUrl: z
      .string()
      .url("Enter a valid URL.")
      .max(2048)
      .nullable()
      .optional(),
    countryCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Use a two-letter country code.")
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    preferredLanguage: z.string().trim().min(2).max(16).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const grantRoleSchema = z.object({
  role: z.enum(["EXPERT", "ADMIN"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type GrantRoleInput = z.infer<typeof grantRoleSchema>;
