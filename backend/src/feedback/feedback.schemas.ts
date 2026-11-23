import { z } from "zod";

export const submitFeedbackSchema = z
  .object({
    templateId: z.string().uuid("Choose a valid feedback template."),
    scores: z
      .array(
        z.object({
          criterionId: z.string().uuid("Choose a valid criterion."),
          score: z
            .number()
            .int("Scores must be whole numbers.")
            .min(1, "Scores must be between 1 and 5.")
            .max(5, "Scores must be between 1 and 5."),
          evidenceComment: z.string().trim().max(1000).optional(),
        }),
      )
      .min(1, "Score every criterion.")
      .max(20),
    overallSummary: z
      .string()
      .trim()
      .min(20, "Write an overall summary of at least 20 characters.")
      .max(4000),
    strengths: z
      .string()
      .trim()
      .min(10, "List at least one strength.")
      .max(4000),
    improvementAreas: z
      .string()
      .trim()
      .min(10, "List at least one improvement area.")
      .max(4000),
    recommendations: z.string().trim().max(4000).optional(),
  })
  .superRefine((input, context) => {
    const seen = new Set<string>();

    input.scores.forEach((score, index) => {
      if (seen.has(score.criterionId)) {
        context.addIssue({
          code: "custom",
          path: ["scores", index, "criterionId"],
          message: "Each criterion can only be scored once.",
        });
      }

      seen.add(score.criterionId);
    });
  });

export const submitReviewSchema = z.object({
  rating: z
    .number()
    .int("Choose a whole-number rating.")
    .min(1, "Choose a rating between 1 and 5.")
    .max(5, "Choose a rating between 1 and 5."),
  comment: z.string().trim().max(1500).optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
