"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import type { ReviewResponse } from "@/lib/types";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

const ratingLabels: Record<number, string> = {
  1: "1 — Not helpful",
  2: "2 — Below expectations",
  3: "3 — Met expectations",
  4: "4 — Very helpful",
  5: "5 — Excellent",
};

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) {
      return;
    }

    if (!rating) {
      setError("Choose a rating between 1 and 5.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest<ReviewResponse>(`/bookings/${bookingId}/review`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      setMessage(
        "Thank you. Your review has been published on the expert's profile.",
      );
      router.refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface-muted p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-foreground">
        Review your expert
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Your rating is separate from the expert&apos;s feedback about you. It
        appears on the expert&apos;s public profile without your name.
      </p>

      <fieldset className="mt-4">
        <legend className={labelClass}>Rating</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                rating === value
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-border bg-surface text-muted hover:bg-surface-muted"
              }`}
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="sr-only"
              />
              {ratingLabels[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label className={labelClass} htmlFor="review-comment">
          Comment (optional)
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          maxLength={1500}
          className={inputClass}
          placeholder="What was useful about this interview?"
        />
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting}
        className={`${primaryButtonClass} mt-4`}
      >
        {submitting ? "Publishing…" : "Publish review"}
      </button>

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
