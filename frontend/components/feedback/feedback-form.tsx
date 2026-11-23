"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import type { FeedbackResponse, FeedbackTemplate } from "@/lib/types";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

const scoreLabels: Record<string, string> = {
  "1": "1 — Needs significant work",
  "2": "2 — Developing",
  "3": "3 — Meets expectations",
  "4": "4 — Strong",
  "5": "5 — Excellent",
};

export function FeedbackForm({
  bookingId,
  template,
}: {
  bookingId: string;
  template: FeedbackTemplate;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [overallSummary, setOverallSummary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvementAreas, setImprovementAreas] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};

    for (const criterion of template.criteria) {
      if (!scores[criterion.id]) {
        next[`criterion-${criterion.id}`] =
          `Choose a score for ${criterion.name}.`;
      }
    }

    if (overallSummary.trim().length < 20) {
      next.overallSummary =
        "Write an overall summary of at least 20 characters.";
    }

    if (strengths.trim().length < 10) {
      next.strengths = "List at least one specific strength.";
    }

    if (improvementAreas.trim().length < 10) {
      next.improvementAreas = "List at least one improvement area.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function reset() {
    setScores({});
    setEvidence({});
    setOverallSummary("");
    setStrengths("");
    setImprovementAreas("");
    setRecommendations("");
    setErrors({});
    setError(null);
    setMessage(null);
  }

  async function submit() {
    if (submitting || !validate()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest<FeedbackResponse>(`/bookings/${bookingId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          templateId: template.id,
          scores: template.criteria.map((criterion) => ({
            criterionId: criterion.id,
            score: Number(scores[criterion.id]),
            evidenceComment: evidence[criterion.id]?.trim() || undefined,
          })),
          overallSummary: overallSummary.trim(),
          strengths: strengths.trim(),
          improvementAreas: improvementAreas.trim(),
          recommendations: recommendations.trim() || undefined,
        }),
      });

      setMessage("Feedback submitted. The booking is now complete.");
      router.refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
      setErrors(fieldErrors(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface-muted p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-foreground">
        Submit the feedback report
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Score every criterion using the 1–5 scale and write evidence-based
        feedback. The booking completes when the report is submitted, and the
        candidate can then see it.
      </p>

      <div className="mt-5 space-y-5">
        {template.criteria.map((criterion) => (
          <fieldset
            key={criterion.id}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <legend className="px-1 text-sm font-semibold text-foreground">
              {criterion.name}
            </legend>
            {criterion.description ? (
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {criterion.description}
              </p>
            ) : null}

            <div className="mt-3">
              <label className={labelClass} htmlFor={`score-${criterion.id}`}>
                Score
              </label>
              <select
                id={`score-${criterion.id}`}
                value={scores[criterion.id] ?? ""}
                onChange={(event) =>
                  setScores((current) => ({
                    ...current,
                    [criterion.id]: event.target.value,
                  }))
                }
                className={inputClass}
                aria-invalid={Boolean(errors[`criterion-${criterion.id}`])}
              >
                <option value="">Choose a score</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={String(value)}>
                    {scoreLabels[String(value)]}
                  </option>
                ))}
              </select>
              {errors[`criterion-${criterion.id}`] ? (
                <p className="mt-1 text-xs text-error">
                  {errors[`criterion-${criterion.id}`]}
                </p>
              ) : null}
            </div>

            <div className="mt-3">
              <label
                className={labelClass}
                htmlFor={`evidence-${criterion.id}`}
              >
                Evidence (optional)
              </label>
              <textarea
                id={`evidence-${criterion.id}`}
                value={evidence[criterion.id] ?? ""}
                onChange={(event) =>
                  setEvidence((current) => ({
                    ...current,
                    [criterion.id]: event.target.value,
                  }))
                }
                rows={2}
                maxLength={1000}
                className={inputClass}
                placeholder="What did the candidate say or do that supports this score?"
              />
            </div>
          </fieldset>
        ))}

        <div>
          <label className={labelClass} htmlFor="overall-summary">
            Overall summary
          </label>
          <textarea
            id="overall-summary"
            value={overallSummary}
            onChange={(event) => setOverallSummary(event.target.value)}
            rows={4}
            maxLength={4000}
            className={inputClass}
            placeholder="Summarize the candidate's overall performance and readiness."
            aria-invalid={Boolean(errors.overallSummary)}
          />
          {errors.overallSummary ? (
            <p className="mt-1 text-xs text-error">{errors.overallSummary}</p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="strengths">
              Strengths
            </label>
            <textarea
              id="strengths"
              value={strengths}
              onChange={(event) => setStrengths(event.target.value)}
              rows={4}
              maxLength={4000}
              className={inputClass}
              placeholder="What did the candidate do well?"
              aria-invalid={Boolean(errors.strengths)}
            />
            {errors.strengths ? (
              <p className="mt-1 text-xs text-error">{errors.strengths}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="improvement-areas">
              Improvement areas
            </label>
            <textarea
              id="improvement-areas"
              value={improvementAreas}
              onChange={(event) => setImprovementAreas(event.target.value)}
              rows={4}
              maxLength={4000}
              className={inputClass}
              placeholder="What should the candidate work on next?"
              aria-invalid={Boolean(errors.improvementAreas)}
            />
            {errors.improvementAreas ? (
              <p className="mt-1 text-xs text-error">
                {errors.improvementAreas}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="recommendations">
            Recommendations (optional)
          </label>
          <textarea
            id="recommendations"
            value={recommendations}
            onChange={(event) => setRecommendations(event.target.value)}
            rows={3}
            maxLength={4000}
            className={inputClass}
            placeholder="Suggest practice areas, resources, or next steps."
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className={primaryButtonClass}
        >
          {submitting ? "Submitting…" : "Submit feedback"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={submitting}
          className={secondaryButtonClass}
        >
          Discard changes
        </button>
      </div>

      <div aria-live="polite">
        {error ? (
          <p className="mt-3 rounded-lg border border-error/20 bg-error-soft px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 rounded-lg border border-success/20 bg-success-soft px-3 py-2 text-sm text-success">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
