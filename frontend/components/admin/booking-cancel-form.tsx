"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import { formatMoney } from "@/lib/labels";
import { inputClass, labelClass } from "@/lib/ui";

export function BookingCancelForm({
  bookingId,
  maxRefund,
  currency,
}: {
  bookingId: string;
  maxRefund: number;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);

    try {
      await apiRequest(`/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason, refundAmount }),
      });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-error/30 bg-error-soft px-4 text-sm font-semibold text-error transition-colors hover:bg-error/10"
      >
        Cancel booking
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-error/20 bg-error-soft/40 p-4">
      <h3 className="text-sm font-semibold text-foreground">
        Cancel this booking
      </h3>
      <p className="mt-1 text-xs text-muted">
        This releases the slot and records the action in the audit log. A refund
        record is only a manual ledger entry; Mockoraa does not move money.
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-error">
          {errorMessage(error)}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="cancel-reason" className={labelClass}>
            Reason (recorded for the booking and audit log)
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <label htmlFor="refund-amount" className={labelClass}>
            Manual refund amount
          </label>
          <input
            id="refund-amount"
            type="number"
            min={0}
            max={maxRefund}
            step={1}
            value={refundAmount}
            onChange={(event) => setRefundAmount(Number(event.target.value))}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">
            Maximum refundable: {formatMoney(maxRefund, currency)}.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            pending ||
            reason.trim().length < 5 ||
            refundAmount < 0 ||
            refundAmount > maxRefund
          }
          onClick={() => void submit()}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-error px-4 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Cancelling…" : "Confirm cancellation"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setReason("");
            setRefundAmount(0);
            setError(null);
          }}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
        >
          Keep booking
        </button>
      </div>
    </div>
  );
}
