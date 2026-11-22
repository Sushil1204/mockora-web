"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, apiRequest } from "@/lib/api";
import type { BookingResponse } from "@/lib/types";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

export function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<
    "approve" | "decline" | null
  >(null);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: "approve" | "decline") {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    setError(null);
    setMessage(null);

    try {
      await apiRequest<BookingResponse>(`/bookings/${bookingId}/${action}`, {
        method: "POST",
        ...(action === "decline"
          ? {
              body: JSON.stringify({
                reason: reason.trim() || undefined,
              }),
            }
          : {}),
      });

      setMessage(
        action === "approve"
          ? "Request approved. The candidate now has one hour to pay."
          : "Request declined. The slot has been released.",
      );
      setShowDecline(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not update this booking. Check your connection and try again.",
      );

      if (
        requestError instanceof ApiError &&
        ["BOOKING_EXPIRED", "BOOKING_NOT_PENDING"].includes(requestError.code)
      ) {
        router.refresh();
      }
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface-muted p-4">
      <h2 className="text-sm font-semibold text-foreground">Your response</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Approving keeps the slot reserved while the candidate pays. Declining
        releases the slot immediately.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void act("approve")}
          disabled={pendingAction !== null}
          className={primaryButtonClass}
        >
          {pendingAction === "approve" ? "Approving…" : "Approve request"}
        </button>
        <button
          type="button"
          onClick={() => setShowDecline((current) => !current)}
          disabled={pendingAction !== null}
          className={secondaryButtonClass}
        >
          {showDecline ? "Cancel decline" : "Decline request"}
        </button>
      </div>

      {showDecline ? (
        <div className="mt-4">
          <label className={labelClass} htmlFor="decline-reason">
            Reason for declining (optional)
          </label>
          <textarea
            id="decline-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            className={inputClass}
            placeholder="Let the candidate know why this time does not work."
          />
          <button
            type="button"
            onClick={() => void act("decline")}
            disabled={pendingAction !== null}
            className={`${secondaryButtonClass} mt-3`}
          >
            {pendingAction === "decline" ? "Declining…" : "Confirm decline"}
          </button>
        </div>
      ) : null}

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
