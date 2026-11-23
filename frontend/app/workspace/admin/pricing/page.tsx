import type { Metadata } from "next";

import {
  PricingRuleEditor,
  PricingRuleForm,
} from "@/components/admin/pricing-rule-form";
import { formatDateTime, formatMoney } from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminPricingResponse } from "@/lib/types";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Pricing",
};

export const instant = false;

export default async function AdminPricingPage() {
  const response = await fetchServerApi<AdminPricingResponse>(
    "/admin/pricing-rules?includeInactive=true",
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Pricing and commission
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Candidate price and expert payout are fixed per duration. The platform
          share is the difference. Bookings snapshot these amounts at request
          time, so later edits never change historical bookings.
        </p>
      </div>

      <PricingRuleForm />

      {!response ? (
        <p
          role="alert"
          className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          Pricing rules could not be loaded.
        </p>
      ) : response.rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No pricing rules configured.
          </p>
          <p className="mt-1 text-sm text-muted">
            New bookings remain unpriced until an active rule matches their
            duration.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {response.rules.map((rule) => (
            <section key={rule.id} className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {rule.durationMinutes} minutes
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Effective {formatDateTime(rule.effectiveFrom)}
                    {rule.effectiveUntil
                      ? ` to ${formatDateTime(rule.effectiveUntil)}`
                      : " onward"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    rule.isActive
                      ? "border-success/20 bg-success-soft text-success"
                      : "border-border bg-surface-muted text-muted"
                  }`}
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-surface-muted px-3 py-2">
                  <dt className="text-xs text-muted">Candidate pays</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {formatMoney(rule.candidatePriceAmount, rule.currency)}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-muted px-3 py-2">
                  <dt className="text-xs text-muted">Expert payout</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {formatMoney(rule.expertPayoutAmount, rule.currency)}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-muted px-3 py-2">
                  <dt className="text-xs text-muted">Platform</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {formatMoney(rule.platformAmount, rule.currency)}
                    <span className="ml-1 text-xs font-normal text-muted">
                      {rule.commissionPercent}%
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-muted">
                Created by {rule.createdBy?.name ?? "system"} ·{" "}
                {formatDateTime(rule.createdAt)}
              </p>

              <PricingRuleEditor rule={rule} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
