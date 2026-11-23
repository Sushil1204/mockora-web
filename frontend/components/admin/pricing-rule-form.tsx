"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import type { AdminPricingRule } from "@/lib/types";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";

export function PricingRuleForm() {
  const router = useRouter();
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [candidatePriceAmount, setCandidatePriceAmount] = useState(399);
  const [expertPayoutAmount, setExpertPayoutAmount] = useState(260);
  const [currency, setCurrency] = useState("INR");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await apiRequest("/admin/pricing-rules", {
        method: "POST",
        body: JSON.stringify({
          durationMinutes,
          candidatePriceAmount,
          expertPayoutAmount,
          currency,
          isActive,
          ...(effectiveFrom
            ? { effectiveFrom: new Date(effectiveFrom).toISOString() }
            : {}),
          ...(effectiveUntil
            ? { effectiveUntil: new Date(effectiveUntil).toISOString() }
            : {}),
        }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        Add a pricing rule
      </summary>
      <form onSubmit={submit} className="mt-4 space-y-4">
        {error ? (
          <p role="alert" className="text-sm text-error">
            {errorMessage(error)}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="pricing-duration" className={labelClass}>
              Duration (minutes)
            </label>
            <input
              id="pricing-duration"
              type="number"
              min={15}
              max={240}
              value={durationMinutes}
              onChange={(event) =>
                setDurationMinutes(Number(event.target.value))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pricing-price" className={labelClass}>
              Candidate price
            </label>
            <input
              id="pricing-price"
              type="number"
              min={1}
              value={candidatePriceAmount}
              onChange={(event) =>
                setCandidatePriceAmount(Number(event.target.value))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pricing-payout" className={labelClass}>
              Expert payout
            </label>
            <input
              id="pricing-payout"
              type="number"
              min={0}
              value={expertPayoutAmount}
              onChange={(event) =>
                setExpertPayoutAmount(Number(event.target.value))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pricing-currency" className={labelClass}>
              Currency
            </label>
            <input
              id="pricing-currency"
              value={currency}
              maxLength={3}
              onChange={(event) =>
                setCurrency(event.target.value.toUpperCase())
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pricing-from" className={labelClass}>
              Effective from (optional)
            </label>
            <input
              id="pricing-from"
              type="datetime-local"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pricing-until" className={labelClass}>
              Effective until (optional)
            </label>
            <input
              id="pricing-until"
              type="datetime-local"
              value={effectiveUntil}
              onChange={(event) => setEffectiveUntil(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">
          Platform share:{" "}
          <span className="font-semibold text-foreground">
            {Math.max(0, candidatePriceAmount - expertPayoutAmount)} {currency}
          </span>{" "}
          (
          {candidatePriceAmount > 0
            ? Math.round(
                ((candidatePriceAmount - expertPayoutAmount) /
                  candidatePriceAmount) *
                  1000,
              ) / 10
            : 0}
          %)
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Active
        </label>

        <button
          type="submit"
          disabled={
            pending ||
            expertPayoutAmount >= candidatePriceAmount ||
            candidatePriceAmount < 1
          }
          className={primaryButtonClass}
        >
          {pending ? "Saving…" : "Create pricing rule"}
        </button>
      </form>
    </details>
  );
}

export function PricingRuleEditor({ rule }: { rule: AdminPricingRule }) {
  const router = useRouter();
  const [candidatePriceAmount, setCandidatePriceAmount] = useState(
    rule.candidatePriceAmount,
  );
  const [expertPayoutAmount, setExpertPayoutAmount] = useState(
    rule.expertPayoutAmount,
  );
  const [isActive, setIsActive] = useState(rule.isActive);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await apiRequest(`/admin/pricing-rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          candidatePriceAmount,
          expertPayoutAmount,
          isActive,
        }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="mt-3 border-t border-border pt-3">
      <summary className="cursor-pointer text-xs font-semibold text-primary-700">
        Edit rule
      </summary>
      <form onSubmit={submit} className="mt-3 space-y-3">
        {error ? (
          <p role="alert" className="text-sm text-error">
            {errorMessage(error)}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`price-${rule.id}`}
              className="mb-1 block text-xs font-medium text-muted"
            >
              Candidate price
            </label>
            <input
              id={`price-${rule.id}`}
              type="number"
              min={1}
              value={candidatePriceAmount}
              onChange={(event) =>
                setCandidatePriceAmount(Number(event.target.value))
              }
              className={`${inputClass} h-10 py-2`}
            />
          </div>
          <div>
            <label
              htmlFor={`payout-${rule.id}`}
              className="mb-1 block text-xs font-medium text-muted"
            >
              Expert payout
            </label>
            <input
              id={`payout-${rule.id}`}
              type="number"
              min={0}
              value={expertPayoutAmount}
              onChange={(event) =>
                setExpertPayoutAmount(Number(event.target.value))
              }
              className={`${inputClass} h-10 py-2`}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Active
        </label>
        <button
          type="submit"
          disabled={pending || expertPayoutAmount >= candidatePriceAmount}
          className="inline-flex h-9 items-center rounded-lg bg-primary-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <p className="text-xs text-muted">
          Existing bookings keep their original price snapshot.
        </p>
      </form>
    </details>
  );
}
