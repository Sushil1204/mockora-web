import type { PublicAvailability } from "@/lib/types";
import { cardClass } from "@/lib/ui";

const MAX_DAYS = 3;
const MAX_SLOTS_PER_DAY = 4;

function dateKey(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatDayKey(key: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${key}T12:00:00.000Z`));
}

function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function timezoneLabel(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(new Date());

  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

export function AvailabilityPreview({
  availability,
}: {
  availability: PublicAvailability | null;
}) {
  if (!availability) {
    return null;
  }

  const groups = new Map<string, string[]>();

  for (const slot of availability.slots) {
    const key = dateKey(slot.startsAt, availability.timezone);
    const slots = groups.get(key) ?? [];
    slots.push(slot.startsAt);
    groups.set(key, slots);
  }

  const days = [...groups.entries()].slice(0, MAX_DAYS);

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          Upcoming availability
        </h2>
        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
          {timezoneLabel(availability.timezone)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Times shown in the expert&apos;s timezone ({availability.timezone}).
      </p>

      {days.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
          No open times in the next two weeks. Check back soon.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {days.map(([key, starts]) => (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {formatDayKey(key, availability.timezone)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {starts.slice(0, MAX_SLOTS_PER_DAY).map((start) => (
                  <span
                    key={start}
                    className="rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-xs font-semibold text-primary-700"
                  >
                    {formatTime(start, availability.timezone)}
                  </span>
                ))}
                {starts.length > MAX_SLOTS_PER_DAY ? (
                  <span className="px-1 py-1.5 text-xs text-muted">
                    +{starts.length - MAX_SLOTS_PER_DAY} more
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
        Slots require at least {availability.minimumNoticeMinutes / 60}{" "}
        hours&apos; notice. Sign in to request an open time.
      </p>
    </section>
  );
}
