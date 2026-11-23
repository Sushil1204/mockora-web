"use client";

import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import type {
  AvailabilityException,
  AvailabilityRule,
  OwnAvailability,
} from "@/lib/types";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

type RuleEditor = {
  key: string;
  weekday: number;
  startLocalTime: string;
  endLocalTime: string;
  timezone: string;
  slotDurationMinutes: number;
  effectiveFrom: string;
  effectiveUntil: string;
  isActive: boolean;
};

let ruleKey = 0;

function createRule(today: string, timezone: string): RuleEditor {
  ruleKey += 1;

  return {
    key: `rule-${ruleKey}`,
    weekday: 1,
    startLocalTime: "09:00",
    endLocalTime: "17:00",
    timezone,
    slotDurationMinutes: 45,
    effectiveFrom: today,
    effectiveUntil: "",
    isActive: true,
  };
}

function toEditor(rule: AvailabilityRule): RuleEditor {
  return {
    key: `saved-${rule.id}`,
    weekday: rule.weekday,
    startLocalTime: rule.startLocalTime,
    endLocalTime: rule.endLocalTime,
    timezone: rule.timezone,
    slotDurationMinutes: rule.slotDurationMinutes,
    effectiveFrom: rule.effectiveFrom,
    effectiveUntil: rule.effectiveUntil ?? "",
    isActive: rule.isActive,
  };
}

function formatExceptionDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatExceptionRange(
  exception: AvailabilityException,
  timeZone: string,
): string {
  const start = formatExceptionDate(exception.startsAt, timeZone);
  const end = formatExceptionDate(
    new Date(new Date(exception.endsAt).getTime() - 1000).toISOString(),
    timeZone,
  );

  return start === end ? start : `${start} – ${end}`;
}

export function AvailabilityManager({
  initial,
  today,
}: {
  initial: OwnAvailability;
  today: string;
}) {
  const [timezone, setTimezone] = useState(initial.timezone);
  const [rules, setRules] = useState<RuleEditor[]>(() =>
    initial.rules.map(toEditor),
  );
  const [exceptions, setExceptions] = useState(initial.exceptions);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [savingRules, setSavingRules] = useState(false);

  const [exceptionStart, setExceptionStart] = useState(today);
  const [exceptionEnd, setExceptionEnd] = useState(today);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionError, setExceptionError] = useState<unknown>(null);
  const [exceptionSaved, setExceptionSaved] = useState<string | null>(null);
  const [savingException, setSavingException] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function updateRule(key: string, patch: Partial<RuleEditor>) {
    setRules((current) =>
      current.map((rule) => (rule.key === key ? { ...rule, ...patch } : rule)),
    );
  }

  async function saveRules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);

    if (
      rules.some(
        (rule) =>
          rule.endLocalTime <= rule.startLocalTime ||
          !rule.timezone.trim() ||
          !rule.effectiveFrom,
      )
    ) {
      setError(
        new Error(
          "Each window needs a start time before its end time, a timezone, and a start date.",
        ),
      );
      return;
    }

    setSavingRules(true);

    try {
      const response = await apiRequest<{
        timezone: string;
        rules: AvailabilityRule[];
      }>("/expert/availability/rules", {
        method: "PUT",
        body: JSON.stringify({
          rules: rules.map((rule) => ({
            weekday: rule.weekday,
            startLocalTime: rule.startLocalTime,
            endLocalTime: rule.endLocalTime,
            timezone: rule.timezone.trim(),
            slotDurationMinutes: rule.slotDurationMinutes,
            effectiveFrom: rule.effectiveFrom,
            effectiveUntil: rule.effectiveUntil || null,
            isActive: rule.isActive,
          })),
        }),
      });

      setRules(response.rules.map(toEditor));
      setTimezone(response.timezone);
      setSaved(
        "Availability updated. Candidates can now see open slots in these windows.",
      );
    } catch (caught) {
      setError(caught);
    } finally {
      setSavingRules(false);
    }
  }

  async function addException(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExceptionError(null);
    setExceptionSaved(null);

    if (exceptionEnd < exceptionStart) {
      setExceptionError(
        new Error("The end date cannot be before the start date."),
      );
      return;
    }

    setSavingException(true);

    try {
      const response = await apiRequest<{ exception: AvailabilityException }>(
        "/expert/availability/exceptions",
        {
          method: "POST",
          body: JSON.stringify({
            startDate: exceptionStart,
            endDate: exceptionEnd,
            reason: exceptionReason.trim() || null,
          }),
        },
      );

      setExceptions((current) =>
        [...current, response.exception].sort((left, right) =>
          left.startsAt.localeCompare(right.startsAt),
        ),
      );
      setExceptionReason("");
      setExceptionSaved("Dates blocked. No slots will be offered.");
    } catch (caught) {
      setExceptionError(caught);
    } finally {
      setSavingException(false);
    }
  }

  async function deleteException(exceptionId: string) {
    setExceptionError(null);
    setExceptionSaved(null);
    setDeletingId(exceptionId);

    try {
      await apiRequest(`/expert/availability/exceptions/${exceptionId}`, {
        method: "DELETE",
      });
      setExceptions((current) =>
        current.filter((exception) => exception.id !== exceptionId),
      );
      setExceptionSaved("Blocked dates removed.");
    } catch (caught) {
      setExceptionError(caught);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveRules} className={cardClass} noValidate>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Weekly availability
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Each window repeats every week in your timezone. Candidates see
              slots of the selected length, with at least two hours&apos;
              notice. Times are converted to UTC on the server so
              daylight-saving changes do not shift your hours.
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
            {timezone}
          </span>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
          >
            {errorMessage(error)}
          </div>
        ) : null}

        {saved ? (
          <div
            role="status"
            className="mt-4 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-foreground"
          >
            {saved}
          </div>
        ) : null}

        {rules.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted">
            No weekly windows yet. Add one to start publishing availability.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {rules.map((rule, index) => (
              <fieldset
                key={rule.key}
                className="rounded-xl border border-border p-4 sm:p-5"
              >
                <legend className="px-1 text-sm font-semibold text-foreground">
                  Window {index + 1}
                </legend>

                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label
                      htmlFor={`weekday-${rule.key}`}
                      className={labelClass}
                    >
                      Day
                    </label>
                    <select
                      id={`weekday-${rule.key}`}
                      value={rule.weekday}
                      onChange={(event) =>
                        updateRule(rule.key, {
                          weekday: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    >
                      {weekdays.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`start-${rule.key}`} className={labelClass}>
                      From
                    </label>
                    <input
                      id={`start-${rule.key}`}
                      type="time"
                      value={rule.startLocalTime}
                      onChange={(event) =>
                        updateRule(rule.key, {
                          startLocalTime: event.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor={`end-${rule.key}`} className={labelClass}>
                      Until
                    </label>
                    <input
                      id={`end-${rule.key}`}
                      type="time"
                      value={rule.endLocalTime}
                      onChange={(event) =>
                        updateRule(rule.key, {
                          endLocalTime: event.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`duration-${rule.key}`}
                      className={labelClass}
                    >
                      Slot length
                    </label>
                    <select
                      id={`duration-${rule.key}`}
                      value={rule.slotDurationMinutes}
                      onChange={(event) =>
                        updateRule(rule.key, {
                          slotDurationMinutes: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    >
                      {[30, 45, 60, 90].map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} minutes
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`timezone-${rule.key}`}
                      className={labelClass}
                    >
                      Timezone
                    </label>
                    <input
                      id={`timezone-${rule.key}`}
                      type="text"
                      maxLength={64}
                      value={rule.timezone}
                      onChange={(event) =>
                        updateRule(rule.key, { timezone: event.target.value })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`from-date-${rule.key}`}
                      className={labelClass}
                    >
                      Effective from
                    </label>
                    <input
                      id={`from-date-${rule.key}`}
                      type="date"
                      value={rule.effectiveFrom}
                      onChange={(event) =>
                        updateRule(rule.key, {
                          effectiveFrom: event.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`until-date-${rule.key}`}
                      className={labelClass}
                    >
                      Effective until
                    </label>
                    <input
                      id={`until-date-${rule.key}`}
                      type="date"
                      value={rule.effectiveUntil}
                      onChange={(event) =>
                        updateRule(rule.key, {
                          effectiveUntil: event.target.value,
                        })
                      }
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-muted">Optional.</p>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            isActive: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-primary-600"
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setRules((current) =>
                          current.filter((item) => item.key !== rule.key),
                        )
                      }
                      className="pb-2 text-sm font-medium text-error hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </fieldset>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setRules((current) => [...current, createRule(today, timezone)])
            }
            className={secondaryButtonClass}
          >
            Add weekly window
          </button>
          <button
            type="submit"
            disabled={savingRules}
            className={primaryButtonClass}
          >
            {savingRules ? "Saving…" : "Save availability"}
          </button>
        </div>
      </form>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-foreground">Blocked dates</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Block full days for holidays or time off. Blocked dates override your
          weekly windows and disappear from public availability immediately.
        </p>

        {exceptionError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
          >
            {errorMessage(exceptionError)}
          </div>
        ) : null}

        {exceptionSaved ? (
          <div
            role="status"
            className="mt-4 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-foreground"
          >
            {exceptionSaved}
          </div>
        ) : null}

        <form
          onSubmit={addException}
          className="mt-5 grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto] sm:p-5"
          noValidate
        >
          <div>
            <label htmlFor="exception-start" className={labelClass}>
              From
            </label>
            <input
              id="exception-start"
              type="date"
              value={exceptionStart}
              onChange={(event) => setExceptionStart(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="exception-end" className={labelClass}>
              Through
            </label>
            <input
              id="exception-end"
              type="date"
              value={exceptionEnd}
              onChange={(event) => setExceptionEnd(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="exception-reason" className={labelClass}>
              Reason
            </label>
            <input
              id="exception-reason"
              type="text"
              maxLength={280}
              placeholder="Conference, holiday, personal leave"
              value={exceptionReason}
              onChange={(event) => setExceptionReason(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingException}
              className={`${primaryButtonClass} w-full lg:w-auto`}
            >
              {savingException ? "Blocking…" : "Block dates"}
            </button>
          </div>
        </form>

        {exceptions.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted">
            No blocked dates. Your weekly windows are fully open.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
            {exceptions.map((exception) => (
              <li
                key={exception.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {formatExceptionRange(exception, timezone)}
                  </p>
                  <p className="text-muted">
                    {exception.reason ?? "Unavailable"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deletingId === exception.id}
                  onClick={() => void deleteException(exception.id)}
                  className="font-medium text-error hover:underline disabled:opacity-60"
                >
                  {deletingId === exception.id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
