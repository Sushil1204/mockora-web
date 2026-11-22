import {
  addDays,
  dateDifference,
  isoWeekday,
  parseLocalTimeMinutes,
  zonedDateTimeToUtc,
} from "./timezone";

export const MINIMUM_NOTICE_MINUTES = 120;
export const MAX_AVAILABILITY_RANGE_DAYS = 14;
export const MAX_SLOTS_PER_RESPONSE = 500;

export type AvailabilityRule = {
  id: string;
  weekday: number;
  startLocalTime: string;
  endLocalTime: string;
  timezone: string;
  slotDurationMinutes: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  isActive: boolean;
};

export type TimeRange = {
  startsAt: Date;
  endsAt: Date;
};

export type AvailableSlot = {
  startsAt: Date;
  endsAt: Date;
  ruleId: string;
};

export type CalculateSlotsInput = {
  rules: AvailabilityRule[];
  exceptions: TimeRange[];
  reservations: TimeRange[];
  from: string;
  to: string;
  now: Date;
  minimumNoticeMinutes?: number;
};

export type CalculateSlotsResult = {
  slots: AvailableSlot[];
  truncated: boolean;
};

/**
 * Expands weekly rules into concrete UTC slots. All boundary math happens in
 * the rule's IANA timezone, so DST transitions and servers in another timezone
 * cannot shift an expert's working hours.
 */
export function calculateAvailableSlots({
  rules,
  exceptions,
  reservations,
  from,
  to,
  now,
  minimumNoticeMinutes = MINIMUM_NOTICE_MINUTES,
}: CalculateSlotsInput): CalculateSlotsResult {
  if (dateDifference(from, to) > MAX_AVAILABILITY_RANGE_DAYS - 1) {
    throw new Error("Availability range exceeds the supported window.");
  }

  const noticeCutoff = now.getTime() + minimumNoticeMinutes * 60_000;
  const slots = new Map<string, AvailableSlot>();

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const weekday = isoWeekday(date);

    for (const rule of rules) {
      if (!rule.isActive || rule.weekday !== weekday) {
        continue;
      }

      const effectiveFrom = rule.effectiveFrom.toISOString().slice(0, 10);
      const effectiveUntil = rule.effectiveUntil?.toISOString().slice(0, 10);

      if (date < effectiveFrom || (effectiveUntil && date > effectiveUntil)) {
        continue;
      }

      const startMinutes = parseLocalTimeMinutes(rule.startLocalTime);
      const endMinutes = parseLocalTimeMinutes(rule.endLocalTime);

      if (startMinutes === null || endMinutes === null) {
        continue;
      }

      if (endMinutes <= startMinutes || rule.slotDurationMinutes <= 0) {
        continue;
      }

      const windowStart = zonedDateTimeToUtc(
        date,
        rule.startLocalTime,
        rule.timezone,
      );
      const windowEnd = zonedDateTimeToUtc(
        date,
        rule.endLocalTime,
        rule.timezone,
      );

      if (!windowStart || !windowEnd || windowEnd <= windowStart) {
        continue;
      }

      const durationMs = rule.slotDurationMinutes * 60_000;
      const windowEndTime = windowEnd.getTime();

      for (
        let startTime = windowStart.getTime();
        startTime + durationMs <= windowEndTime;
        startTime += durationMs
      ) {
        if (startTime < noticeCutoff) {
          continue;
        }

        const endTime = startTime + durationMs;
        const startsAt = new Date(startTime);
        const endsAt = new Date(endTime);

        if (
          overlapsAny(startsAt, endsAt, exceptions) ||
          overlapsAny(startsAt, endsAt, reservations)
        ) {
          continue;
        }

        const key = `${startTime}:${endTime}`;
        if (!slots.has(key)) {
          slots.set(key, { startsAt, endsAt, ruleId: rule.id });
        }
      }
    }
  }

  const sorted = [...slots.values()].sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );

  return {
    slots: sorted.slice(0, MAX_SLOTS_PER_RESPONSE),
    truncated: sorted.length > MAX_SLOTS_PER_RESPONSE,
  };
}

function overlapsAny(
  startsAt: Date,
  endsAt: Date,
  ranges: TimeRange[],
): boolean {
  return ranges.some(
    (range) => startsAt < range.endsAt && range.startsAt < endsAt,
  );
}
