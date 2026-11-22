"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, apiRequest } from "@/lib/api";
import type { Payment, PaymentResponse } from "@/lib/types";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type Stage = "idle" | "creating" | "checkout" | "submitting" | "failed";

export function MockPaymentPanel({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = stage === "creating" || stage === "submitting";

  async function openCheckout() {
    setStage("creating");
    setError(null);

    try {
      const response = await apiRequest<PaymentResponse>(
        `/bookings/${bookingId}/payment-attempts`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": `payment_${crypto.randomUUID()}`,
          },
        },
      );

      setPayment(response.payment);
      setStage("checkout");
    } catch (requestError) {
      handleRequestError(requestError);
    }
  }

  async function submitResult(outcome: "SUCCESS" | "FAILURE") {
    if (!payment) {
      return;
    }

    setStage("submitting");
    setError(null);

    try {
      const response = await apiRequest<PaymentResponse>(
        `/payments/${payment.id}/mock-result`,
        {
          method: "POST",
          body: JSON.stringify({
            outcome,
            ...(outcome === "FAILURE"
              ? { failureReason: "Simulated payment failure." }
              : {}),
          }),
        },
      );

      setPayment(response.payment);

      if (response.payment.status === "SUCCEEDED") {
        router.refresh();
        return;
      }

      setStage("failed");
      setError(
        response.payment.failureReason ??
          "The simulated payment was declined. No charge was made.",
      );
    } catch (requestError) {
      handleRequestError(requestError);
    }
  }

  function handleRequestError(requestError: unknown) {
    const apiError = requestError instanceof ApiError ? requestError : null;

    setError(
      apiError?.message ??
        "We could not complete the mock payment. Check your connection and try again.",
    );
    setStage(apiError?.code === "PAYMENT_NOT_PENDING" ? "failed" : "idle");

    if (
      apiError &&
      [
        "BOOKING_EXPIRED",
        "BOOKING_NOT_PAYABLE",
        "SLOT_RESERVATION_UNAVAILABLE",
      ].includes(apiError.code)
    ) {
      router.refresh();
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-info/20 bg-info-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-info">Mock payment</h2>
        <span className="rounded-full border border-info/30 bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-info">
          Simulation only
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-info">
        This demo checkout never collects real money. A simulated success is
        validated by the backend and confirms the booking.
      </p>

      {stage === "idle" ? (
        <button
          type="button"
          onClick={() => void openCheckout()}
          disabled={busy}
          className={`${primaryButtonClass} mt-4`}
        >
          Open mock payment
        </button>
      ) : null}

      {stage === "creating" ? (
        <p className="mt-4 text-sm text-info" aria-live="polite">
          Creating a mock payment attempt…
        </p>
      ) : null}

      {stage === "checkout" && payment ? (
        <div className="mt-4 rounded-lg border border-info/20 bg-surface p-4">
          <p className="text-sm font-medium text-foreground">
            Simulated checkout
          </p>
          <p className="mt-1 text-xs text-muted">
            No card details are required. Choose the result you want to test.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void submitResult("SUCCESS")}
              disabled={busy}
              className={primaryButtonClass}
            >
              Simulate successful payment
            </button>
            <button
              type="button"
              onClick={() => void submitResult("FAILURE")}
              disabled={busy}
              className={secondaryButtonClass}
            >
              Simulate failed payment
            </button>
          </div>
        </div>
      ) : null}

      {stage === "submitting" ? (
        <p className="mt-4 text-sm text-info" aria-live="polite">
          Submitting the simulated payment result…
        </p>
      ) : null}

      {stage === "failed" ? (
        <div className="mt-4 rounded-lg border border-error/20 bg-surface p-4">
          <p className="text-sm font-medium text-error">
            The mock payment did not succeed.
          </p>
          <button
            type="button"
            onClick={() => void openCheckout()}
            disabled={busy}
            className={`${secondaryButtonClass} mt-3`}
          >
            Try another mock payment
          </button>
        </div>
      ) : null}

      <div aria-live="polite">
        {error ? (
          <p className="mt-3 rounded-lg border border-error/20 bg-error-soft px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}
        {payment?.status === "SUCCEEDED" ? (
          <p className="mt-3 rounded-lg border border-success/20 bg-success-soft px-3 py-2 text-sm text-success">
            Mock payment succeeded. Confirming your booking…
          </p>
        ) : null}
      </div>
    </section>
  );
}
