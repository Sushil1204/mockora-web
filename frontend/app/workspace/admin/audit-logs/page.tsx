import type { Metadata } from "next";
import Link from "next/link";

import { formatDateTime } from "@/lib/labels";
import { fetchServerApi } from "@/lib/session";
import type { AdminAuditResponse } from "@/lib/types";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Audit logs",
};

export const instant = false;

function buildHref(input: {
  action?: string;
  entityType?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.action) params.set("action", input.action);
  if (input.entityType) params.set("entityType", input.entityType);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query
    ? `/workspace/admin/audit-logs?${query}`
    : "/workspace/admin/audit-logs";
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entityType?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const action = params.action?.trim() ?? "";
  const entityType = params.entityType?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (action) query.set("action", action);
  if (entityType) query.set("entityType", entityType);

  const response = await fetchServerApi<AdminAuditResponse>(
    `/admin/audit-logs?${query.toString()}`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Audit logs</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Append-only records of sensitive administrator actions with before and
          after state. Passwords and tokens are never included.
        </p>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div>
          <label
            htmlFor="audit-action"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Action
          </label>
          <input
            id="audit-action"
            name="action"
            defaultValue={action}
            placeholder="PRICING_RULE_UPDATED"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="audit-entity"
            className="mb-1 block text-xs font-medium text-muted"
          >
            Entity type
          </label>
          <input
            id="audit-entity"
            name="entityType"
            defaultValue={entityType}
            placeholder="BOOKING"
            className={inputClass}
          />
        </div>
        <button type="submit" className={secondaryButtonClass}>
          Filter
        </button>
      </form>

      {!response ? (
        <p
          role="alert"
          className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
        >
          Audit logs could not be loaded.
        </p>
      ) : response.logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          No audit entries match these filters.
        </div>
      ) : (
        <div className="space-y-2">
          {response.logs.map((entry) => (
            <details
              key={entry.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <summary className="cursor-pointer">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {entry.action.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {entry.actor?.name ?? "System"} · {entry.entityType}
                  {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}
                </span>
              </summary>
              <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Before
                  </p>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs text-foreground">
                    {entry.beforeState
                      ? JSON.stringify(entry.beforeState, null, 2)
                      : "—"}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    After
                  </p>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs text-foreground">
                    {entry.afterState
                      ? JSON.stringify(entry.afterState, null, 2)
                      : "—"}
                  </pre>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {response && response.pagination.totalPages > 1 ? (
        <div className="flex justify-between text-sm text-muted">
          <span>
            Page {response.pagination.page} of {response.pagination.totalPages}{" "}
            · {response.pagination.total} entries
          </span>
          <div className="flex gap-2">
            {response.pagination.page > 1 ? (
              <Link
                href={buildHref({
                  action,
                  entityType,
                  page: page - 1,
                })}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground"
              >
                Previous
              </Link>
            ) : null}
            {response.pagination.page < response.pagination.totalPages ? (
              <Link
                href={buildHref({
                  action,
                  entityType,
                  page: page + 1,
                })}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
