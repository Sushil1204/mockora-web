"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import { inputClass, labelClass } from "@/lib/ui";

export function PayoutMarkPaid({
  payoutId,
  amountLabel,
}: {
  payoutId: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);

    try {
      await apiRequest(`/admin/payouts/${payoutId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || undefined }),
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
        className="inline-flex h-9 items-center justify-center rounded-lg border border-success/30 bg-success-soft px-3 text-xs font-semibold text-success transition-colors hover:bg-success/10"
      >
        Mark paid
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-xs text-muted">
        Record that {amountLabel} was paid to the expert outside Mockoraa. This
        does not transfer money.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <label
        htmlFor={`payout-note-${payoutId}`}
        className={`${labelClass} mt-3`}
      >
        Payment note (optional)
      </label>
      <input
        id={`payout-note-${payoutId}`}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Bank transfer reference"
        className={`${inputClass} text-xs`}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void submit()}
          className="inline-flex h-9 items-center rounded-lg bg-success px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Confirm paid"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
          className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
