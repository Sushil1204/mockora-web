"use client";

import { useState, type FormEvent } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { SectionHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import type {
  AvailabilityException,
  AvailabilityRule,
  OwnAvailability,
} from "@/lib/types";

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
  const [ruleValidation, setRuleValidation] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [savingRules, setSavingRules] = useState(false);

  const [exceptionStart, setExceptionStart] = useState(today);
  const [exceptionEnd, setExceptionEnd] = useState(today);
  const [exceptionReason, setExceptionReason] = useState("");
  const [exceptionError, setExceptionError] = useState<unknown>(null);
  const [exceptionValidation, setExceptionValidation] = useState<string | null>(
    null,
  );
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
    setRuleValidation(null);
    setSaved(null);

    if (
      rules.some(
        (rule) =>
          rule.endLocalTime <= rule.startLocalTime ||
          !rule.timezone.trim() ||
          !rule.effectiveFrom,
      )
    ) {
      setRuleValidation(
        "Each window needs a start time before its end time, a timezone, and a start date.",
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
    setExceptionValidation(null);
    setExceptionSaved(null);

    if (exceptionEnd < exceptionStart) {
      setExceptionValidation("The end date cannot be before the start date.");
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
      <Card className="p-6 sm:p-8">
        <form onSubmit={saveRules} noValidate>
          <SectionHeader
            title="Weekly availability"
            description="Each window repeats every week in your timezone. Candidates see slots of the selected length, with at least two hours' notice. Times are converted to UTC on the server so daylight-saving changes do not shift your hours."
            action={<Badge variant="neutral">{timezone}</Badge>}
          />

          <div className="mt-5 space-y-4">
            {ruleValidation ? (
              <Alert variant="danger">{ruleValidation}</Alert>
            ) : null}
            {error ? (
              <Alert variant="danger">{errorMessage(error)}</Alert>
            ) : null}
            {saved ? <Alert variant="success">{saved}</Alert> : null}
          </div>

          {rules.length === 0 ? (
            <p className="mt-5 rounded-control border border-dashed border-border px-4 py-4 text-sm text-muted">
              No weekly windows yet. Add one to start publishing availability.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {rules.map((rule, index) => (
                <fieldset
                  key={rule.key}
                  className="rounded-card border border-border p-4 sm:p-5"
                >
                  <legend className="px-1 text-sm font-semibold text-foreground">
                    Window {index + 1}
                  </legend>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field id={`weekday-${rule.key}`} label="Day">
                      <Select
                        value={rule.weekday}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            weekday: Number(event.target.value),
                          })
                        }
                      >
                        {weekdays.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field id={`start-${rule.key}`} label="From">
                      <Input
                        type="time"
                        value={rule.startLocalTime}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            startLocalTime: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <Field id={`end-${rule.key}`} label="Until">
                      <Input
                        type="time"
                        value={rule.endLocalTime}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            endLocalTime: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <Field id={`duration-${rule.key}`} label="Slot length">
                      <Select
                        value={rule.slotDurationMinutes}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            slotDurationMinutes: Number(event.target.value),
                          })
                        }
                      >
                        {[30, 45, 60, 90].map((duration) => (
                          <option key={duration} value={duration}>
                            {duration} minutes
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field id={`timezone-${rule.key}`} label="Timezone">
                      <Input
                        type="text"
                        maxLength={64}
                        value={rule.timezone}
                        onChange={(event) =>
                          updateRule(rule.key, { timezone: event.target.value })
                        }
                      />
                    </Field>

                    <Field id={`from-date-${rule.key}`} label="Effective from">
                      <Input
                        type="date"
                        value={rule.effectiveFrom}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            effectiveFrom: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <Field
                      id={`until-date-${rule.key}`}
                      label="Effective until"
                      hint="Optional."
                    >
                      <Input
                        type="date"
                        value={rule.effectiveUntil}
                        onChange={(event) =>
                          updateRule(rule.key, {
                            effectiveUntil: event.target.value,
                          })
                        }
                      />
                    </Field>

                    <div className="flex items-end justify-between gap-3">
                      <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mb-1 min-h-11 text-error hover:text-error"
                        onClick={() =>
                          setRules((current) =>
                            current.filter((item) => item.key !== rule.key),
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setRules((current) => [...current, createRule(today, timezone)])
              }
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add weekly window
            </Button>
            <Button type="submit" loading={savingRules}>
              {savingRules ? "Saving availability…" : "Save availability"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 sm:p-8">
        <SectionHeader
          title="Blocked dates"
          description="Block full days for holidays or time off. Blocked dates override your weekly windows and disappear from public availability immediately."
        />

        <div className="mt-5 space-y-4">
          {exceptionValidation ? (
            <Alert variant="danger">{exceptionValidation}</Alert>
          ) : null}
          {exceptionError ? (
            <Alert variant="danger">{errorMessage(exceptionError)}</Alert>
          ) : null}
          {exceptionSaved ? (
            <Alert variant="success">{exceptionSaved}</Alert>
          ) : null}
        </div>

        <form
          onSubmit={addException}
          className="mt-5 grid grid-cols-1 gap-4 rounded-card border border-border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto] sm:p-5"
          noValidate
        >
          <Field id="exception-start" label="From">
            <Input
              type="date"
              value={exceptionStart}
              onChange={(event) => setExceptionStart(event.target.value)}
            />
          </Field>
          <Field id="exception-end" label="Through">
            <Input
              type="date"
              value={exceptionEnd}
              onChange={(event) => setExceptionEnd(event.target.value)}
            />
          </Field>
          <Field
            id="exception-reason"
            label="Reason"
            hint="Optional. Only you see this note."
          >
            <Input
              type="text"
              maxLength={280}
              placeholder="Conference, holiday, personal leave"
              value={exceptionReason}
              onChange={(event) => setExceptionReason(event.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button
              type="submit"
              loading={savingException}
              className="w-full lg:w-auto"
            >
              {savingException ? "Blocking…" : "Block dates"}
            </Button>
          </div>
        </form>

        {exceptions.length === 0 ? (
          <div className="mt-5 flex items-start gap-3 rounded-control border border-dashed border-border px-4 py-4">
            <CalendarOff
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-muted"
            />
            <p className="text-sm text-muted">
              No blocked dates. Your weekly windows are fully open.
            </p>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-border rounded-card border border-border">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 text-error hover:text-error"
                  loading={deletingId === exception.id}
                  disabled={deletingId === exception.id}
                  onClick={() => void deleteException(exception.id)}
                >
                  {deletingId === exception.id ? "Removing…" : "Remove"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
