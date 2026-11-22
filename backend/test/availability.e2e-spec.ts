import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { AvailabilityService } from "../src/availability/availability.service";
import {
  addDays,
  formatIsoDate,
  isoWeekday,
} from "../src/availability/timezone";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Expert availability (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let availability: AvailabilityService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    availability = app.get(AvailabilityService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function register(email: string, name = "Availability Tester") {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, name });

    return {
      userId: response.body.user.id as string,
      cookie: getCookieHeader(response.headers["set-cookie"]),
    };
  }

  async function createExpert(
    options: {
      email: string;
      name?: string;
      timezone?: string;
      verificationStatus?: "APPROVED" | "SUBMITTED";
      publicationStatus?: "PUBLISHED" | "UNPUBLISHED";
    } = { email: "expert@example.com" },
  ) {
    const account = await register(options.email, options.name);

    await prisma.userRole.create({
      data: { userId: account.userId, role: "EXPERT", status: "ACTIVE" },
    });

    const profile = await prisma.expertProfile.create({
      data: {
        userId: account.userId,
        professionalHeadline: "Interview coach",
        currentDesignation: "Staff Engineer",
        currentCompany: "Acme",
        countryCode: "IN",
        timezone: options.timezone ?? "UTC",
        introduction: "Experienced interviewer and coach.",
        yearsExperience: 8,
        verificationStatus: options.verificationStatus ?? "APPROVED",
        publicationStatus: options.publicationStatus ?? "PUBLISHED",
      },
    });

    return { ...account, profile };
  }

  function rulesPayload(
    weekday: number,
    effectiveFrom: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      weekday,
      startLocalTime: "09:00",
      endLocalTime: "11:00",
      timezone: "Asia/Kolkata",
      slotDurationMinutes: 30,
      effectiveFrom,
      effectiveUntil: null,
      ...overrides,
    };
  }

  it("lets an expert manage weekly rules and exceptions", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const today = formatIsoDate(new Date());
    const weekday = isoWeekday(today);

    const empty = await request(app.getHttpServer())
      .get("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({
      timezone: "UTC",
      rules: [],
      exceptions: [],
    });

    const save = await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie)
      .send({ rules: [rulesPayload(weekday, today)] });

    expect(save.status).toBe(200);
    expect(save.body.rules).toHaveLength(1);
    expect(save.body.rules[0]).toMatchObject({
      weekday,
      startLocalTime: "09:00",
      endLocalTime: "11:00",
      timezone: "Asia/Kolkata",
      slotDurationMinutes: 30,
      effectiveFrom: today,
      effectiveUntil: null,
      isActive: true,
    });

    const exception = await request(app.getHttpServer())
      .post("/api/v1/expert/availability/exceptions")
      .set("Cookie", expert.cookie)
      .send({ startDate: today, endDate: today, reason: "Conference" });

    expect(exception.status).toBe(201);
    expect(exception.body.exception).toMatchObject({
      exceptionType: "UNAVAILABLE",
      reason: "Conference",
    });

    const fetched = await request(app.getHttpServer())
      .get("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie);
    expect(fetched.body.rules).toHaveLength(1);
    expect(fetched.body.exceptions).toHaveLength(1);
    expect(fetched.body.exceptions[0].id).toBe(exception.body.exception.id);

    const other = await createExpert({ email: "other@example.com" });
    const foreignDelete = await request(app.getHttpServer())
      .delete(
        `/api/v1/expert/availability/exceptions/${exception.body.exception.id}`,
      )
      .set("Cookie", other.cookie);
    expect(foreignDelete.status).toBe(404);
    expect(foreignDelete.body.error.code).toBe(
      "AVAILABILITY_EXCEPTION_NOT_FOUND",
    );

    const deleted = await request(app.getHttpServer())
      .delete(
        `/api/v1/expert/availability/exceptions/${exception.body.exception.id}`,
      )
      .set("Cookie", expert.cookie);
    expect(deleted.status).toBe(204);

    const afterDelete = await request(app.getHttpServer())
      .get("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie);
    expect(afterDelete.body.exceptions).toEqual([]);
  });

  it("rejects invalid rules and non-expert access", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const today = formatIsoDate(new Date());
    const weekday = isoWeekday(today);

    const reversed = await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie)
      .send({
        rules: [
          rulesPayload(weekday, today, {
            startLocalTime: "11:00",
            endLocalTime: "09:00",
          }),
        ],
      });
    expect(reversed.status).toBe(400);

    const badTimezone = await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie)
      .send({
        rules: [rulesPayload(weekday, today, { timezone: "Mars/Olympus" })],
      });
    expect(badTimezone.status).toBe(400);

    const candidate = await register("candidate@example.com");
    const forbidden = await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", candidate.cookie)
      .send({ rules: [] });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");

    const anonymous = await request(app.getHttpServer()).get(
      "/api/v1/expert/availability/rules",
    );
    expect(anonymous.status).toBe(401);
  });

  it("serves timezone-safe public slots and hides unavailable dates", async () => {
    const expert = await createExpert({
      email: "expert@example.com",
      timezone: "Asia/Kolkata",
    });
    const date = addDays(formatIsoDate(new Date()), 2);
    const weekday = isoWeekday(date);

    await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie)
      .send({ rules: [rulesPayload(weekday, date)] })
      .expect(200);

    const url = `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${date}`;
    const slots = await request(app.getHttpServer()).get(url);

    expect(slots.status).toBe(200);
    expect(slots.body.timezone).toBe("Asia/Kolkata");
    expect(slots.body.minimumNoticeMinutes).toBe(120);
    expect(
      slots.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).toEqual([
      `${date}T03:30:00.000Z`,
      `${date}T04:00:00.000Z`,
      `${date}T04:30:00.000Z`,
      `${date}T05:00:00.000Z`,
    ]);

    await request(app.getHttpServer())
      .post("/api/v1/expert/availability/exceptions")
      .set("Cookie", expert.cookie)
      .send({ startDate: date, endDate: date, reason: "Public holiday" })
      .expect(201);

    const blocked = await request(app.getHttpServer()).get(url);
    expect(blocked.body.slots).toEqual([]);

    const tooLong = await request(app.getHttpServer()).get(
      `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${addDays(date, 20)}`,
    );
    expect(tooLong.status).toBe(422);
    expect(tooLong.body.error.code).toBe("INVALID_AVAILABILITY_RANGE");

    const hidden = await createExpert({
      email: "pending@example.com",
      verificationStatus: "SUBMITTED",
      publicationStatus: "UNPUBLISHED",
    });
    const unpublished = await request(app.getHttpServer()).get(
      `/api/v1/experts/${hidden.profile.id}/availability?from=${date}&to=${date}`,
    );
    expect(unpublished.status).toBe(404);
    expect(unpublished.body.error.code).toBe("EXPERT_NOT_FOUND");
  });

  it("prevents concurrent reservations of the same slot", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const firstCandidate = await register("first@example.com", "First");
    const secondCandidate = await register("second@example.com", "Second");
    const date = addDays(formatIsoDate(new Date()), 2);
    const weekday = isoWeekday(date);

    await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie)
      .send({
        rules: [rulesPayload(weekday, date, { timezone: "UTC" })],
      })
      .expect(200);

    const startsAt = new Date(`${date}T09:00:00.000Z`);
    const results = await Promise.allSettled([
      availability.reserveSlot({
        expertProfileId: expert.profile.id,
        candidateUserId: firstCandidate.userId,
        startsAt,
      }),
      availability.reserveSlot({
        expertProfileId: expert.profile.id,
        candidateUserId: secondCandidate.userId,
        startsAt,
      }),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toBeDefined();
    if (rejected?.status === "rejected") {
      expect(rejected.reason.code).toBe("SLOT_UNAVAILABLE");
    }

    expect(await prisma.slotReservation.count()).toBe(1);

    const publicSlots = await request(app.getHttpServer()).get(
      `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${date}`,
    );
    expect(
      publicSlots.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).not.toContain(`${date}T09:00:00.000Z`);
    expect(
      publicSlots.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).toContain(`${date}T09:30:00.000Z`);
  });

  it("releases slots once a reservation expires", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const candidate = await register("candidate@example.com");
    const date = addDays(formatIsoDate(new Date()), 2);
    const weekday = isoWeekday(date);

    await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie)
      .send({ rules: [rulesPayload(weekday, date, { timezone: "UTC" })] })
      .expect(200);

    const startsAt = new Date(`${date}T09:00:00.000Z`);
    const reservation = await availability.reserveSlot({
      expertProfileId: expert.profile.id,
      candidateUserId: candidate.userId,
      startsAt,
    });

    const url = `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${date}`;
    const held = await request(app.getHttpServer()).get(url);
    expect(
      held.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).not.toContain(`${date}T09:00:00.000Z`);

    await prisma.slotReservation.update({
      where: { id: reservation.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const released = await request(app.getHttpServer()).get(url);
    expect(
      released.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).toContain(`${date}T09:00:00.000Z`);

    const stored = await prisma.slotReservation.findUniqueOrThrow({
      where: { id: reservation.id },
    });
    expect(stored.status).toBe("EXPIRED");
  });
});
