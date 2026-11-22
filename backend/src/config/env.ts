import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  SESSION_COOKIE_NAME: z.string().min(1).default("mockoraa_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  PAYMENT_PROVIDER: z.literal("mock").default("mock"),
  ZOOM_VIDEO_SDK_KEY: z.string().min(1).optional(),
  ZOOM_VIDEO_SDK_SECRET: z.string().min(1).optional(),
  INTERVIEW_JOIN_EARLY_MINUTES: z.coerce
    .number()
    .int()
    .min(0)
    .max(240)
    .default(15),
  INTERVIEW_JOIN_CLOSE_GRACE_MINUTES: z.coerce
    .number()
    .int()
    .min(0)
    .max(240)
    .default(15),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${problems}`);
  }

  return result.data;
}
