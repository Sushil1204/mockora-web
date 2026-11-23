"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import type { AccountStatus } from "@/lib/types";
import { inputClass, labelClass } from "@/lib/ui";

export function CandidateActions({
  userId,
  name,
  accountStatus,
}: {
  userId: string;
  name: string;
  accountStatus: AccountStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  const action = accountStatus === "SUSPENDED" ? "reactivate" : "suspend";

  async function submit() {
    setError(null);
    setPending(true);

    try {
      await apiRequest(`/admin/candidates/${userId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setOpen(false);
      setReason("");
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
        className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
          action === "suspend"
            ? "border-error/30 bg-error-soft text-error hover:bg-error/10"
            : "border-success/30 bg-success-soft text-success hover:bg-success/10"
        }`}
      >
        {action === "suspend" ? "Suspend account" : "Reactivate account"}
      </button>
    );
  }

  return (
    <div className="mt-3 w-full max-w-sm rounded-lg border border-border bg-surface-muted p-3">
      {error ? (
        <p role="alert" className="mb-2 text-xs text-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <label htmlFor={`reason-${userId}`} className={labelClass}>
        Reason for {action === "suspend" ? "suspension" : "reactivation"}
      </label>
      <textarea
        id={`reason-${userId}`}
        rows={2}
        maxLength={500}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className={`${inputClass} resize-y text-xs`}
        placeholder={`Explain why ${name}'s account is being ${action === "suspend" ? "suspended" : "reactivated"}.`}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending || reason.trim().length < 3}
          onClick={() => void submit()}
          className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-60 ${
            action === "suspend" ? "bg-error" : "bg-success"
          }`}
        >
          {pending ? "Saving…" : "Confirm"}
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
