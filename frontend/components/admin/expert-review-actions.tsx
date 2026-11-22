"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import type { VerificationStatus } from "@/lib/types";
import { inputClass, labelClass } from "@/lib/ui";

type ReviewAction = "approve" | "reject" | "suspend";

const actionLabels: Record<ReviewAction, string> = {
  approve: "Approve and publish",
  reject: "Request changes",
  suspend: "Suspend expert",
};

const confirmLabels: Record<ReviewAction, string> = {
  approve: "Confirm approval",
  reject: "Confirm rejection",
  suspend: "Confirm suspension",
};

const actionButtonStyles: Record<ReviewAction, string> = {
  approve: "border-success/30 bg-success-soft text-success hover:bg-success/10",
  reject: "border-error/30 bg-error-soft text-error hover:bg-error/10",
  suspend: "border-error/30 bg-error-soft text-error hover:bg-error/10",
};

export function ExpertReviewActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: VerificationStatus;
}) {
  const router = useRouter();
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  const available: ReviewAction[] =
    status === "APPROVED"
      ? ["suspend"]
      : status === "SUBMITTED" || status === "UNDER_REVIEW"
        ? ["approve", "reject"]
        : [];

  if (available.length === 0) {
    return null;
  }

  async function confirm() {
    if (!action) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      await apiRequest(`/admin/experts/${applicationId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });
      setAction(null);
      setNotes("");
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 border-t border-border pt-5">
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          {errorMessage(error)}
        </div>
      ) : null}

      {action ? (
        <div className="space-y-3">
          <div>
            <label
              htmlFor={`review-notes-${applicationId}`}
              className={labelClass}
            >
              {action === "approve"
                ? "Approval notes (optional)"
                : "Reason (required)"}
            </label>
            <textarea
              id={`review-notes-${applicationId}`}
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`${inputClass} resize-y`}
            />
            <p className="mt-1.5 text-xs text-muted">
              {action === "approve"
                ? "These notes are visible to the expert."
                : "Explain what needs to change. The expert sees this message."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || (action !== "approve" && !notes.trim())}
              onClick={() => void confirm()}
              className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${actionButtonStyles[action]}`}
            >
              {pending ? "Saving…" : confirmLabels[action]}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setAction(null);
                setNotes("");
                setError(null);
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAction(option)}
              className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors ${actionButtonStyles[option]}`}
            >
              {actionLabels[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
