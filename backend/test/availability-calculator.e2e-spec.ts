import {
  calculateAvailableSlots,
  type AvailabilityRule,
} from "../src/availability/slot-calculator";

function rule(overrides: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: "rule-1",
    weekday: 1,
    startLocalTime: "09:00",
    endLocalTime: "11:00",
    timezone: "UTC",
    slotDurationMinutes: 30,
    effectiveFrom: new Date("2027-01-01T00:00:00.000Z"),
    effectiveUntil: null,
    isActive: true,
    ...overrides,
  };
}

function isoDates(slots: Array<{ startsAt: Date }>): string[] {
  return slots.map((slot) => slot.startsAt.toISOString());
}

describe("Availability slot calculator", () => {
  it("converts expert local windows to UTC", () => {
    const { slots } = calculateAvailableSlots({
      rules: [rule({ timezone: "Asia/Kolkata" })],
      exceptions: [],
      reservations: [],
      from: "2027-01-04",
      to: "2027-01-04",
      now: new Date("2027-01-01T00:00:00.000Z"),
    });

    expect(isoDates(slots)).toEqual([
      "2027-01-04T03:30:00.000Z",
      "2027-01-04T04:00:00.000Z",
      "2027-01-04T04:30:00.000Z",
      "2027-01-04T05:00:00.000Z",
    ]);
  });

  it("handles daylight-saving transitions in the rule timezone", () => {
    const { slots } = calculateAvailableSlots({
      rules: [
        rule({
          weekday: 7,
          startLocalTime: "01:00",
          endLocalTime: "04:00",
          timezone: "America/New_York",
        }),
      ],
      exceptions: [],
      reservations: [],
      from: "2027-03-14",
      to: "2027-03-14",
      now: new Date("2027-03-01T00:00:00.000Z"),
    });

    expect(isoDates(slots)).toEqual([
      "2027-03-14T06:00:00.000Z",
      "2027-03-14T06:30:00.000Z",
      "2027-03-14T07:00:00.000Z",
      "2027-03-14T07:30:00.000Z",
    ]);
  });

  it("enforces the two-hour minimum notice", () => {
    const { slots } = calculateAvailableSlots({
      rules: [
        rule({
          startLocalTime: "02:00",
          endLocalTime: "05:00",
        }),
      ],
      exceptions: [],
      reservations: [],
      from: "2027-01-04",
      to: "2027-01-04",
      now: new Date("2027-01-04T02:00:00.000Z"),
    });

    expect(isoDates(slots)).toEqual([
      "2027-01-04T04:00:00.000Z",
      "2027-01-04T04:30:00.000Z",
    ]);
  });

  it("removes exceptions, active reservations, and duplicate windows", () => {
    const { slots } = calculateAvailableSlots({
      rules: [
        rule(),
        rule({ id: "rule-2", startLocalTime: "10:00", endLocalTime: "11:00" }),
      ],
      exceptions: [
        {
          startsAt: new Date("2027-01-04T09:00:00.000Z"),
          endsAt: new Date("2027-01-04T09:45:00.000Z"),
        },
      ],
      reservations: [
        {
          startsAt: new Date("2027-01-04T10:00:00.000Z"),
          endsAt: new Date("2027-01-04T10:30:00.000Z"),
        },
      ],
      from: "2027-01-04",
      to: "2027-01-04",
      now: new Date("2027-01-01T00:00:00.000Z"),
    });

    expect(isoDates(slots)).toEqual(["2027-01-04T10:30:00.000Z"]);
  });

  it("honours effective dates and inactive rules", () => {
    const { slots } = calculateAvailableSlots({
      rules: [
        rule({
          effectiveFrom: new Date("2027-02-01T00:00:00.000Z"),
        }),
        rule({
          id: "rule-inactive",
          startLocalTime: "12:00",
          endLocalTime: "13:00",
          isActive: false,
        }),
      ],
      exceptions: [],
      reservations: [],
      from: "2027-01-04",
      to: "2027-01-04",
      now: new Date("2027-01-01T00:00:00.000Z"),
    });

    expect(slots).toEqual([]);
  });
});
