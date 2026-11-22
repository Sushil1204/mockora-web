import type { INestApplication } from "@nestjs/common";
import request from "supertest";

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

describe("Booking lifecycle (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function register(email: string, name = "Booking Tester") {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, name });

    return {
      userId: response.body.user.id as string,
      cookie: getCookieHeader(response.headers["set-cookie"]),
    };
  }

  async function createExpert(options: {
    email: string;
    name?: string;
    timezone?: string;
    verificationStatus?: "APPROVED" | "SUBMITTED";
  }) {
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
        publicationStatus:
          options.verificationStatus === "SUBMITTED"
            ? "UNPUBLISHED"
            : "PUBLISHED",
      },
    });

    return { ...account, profile };
  }

  async function addAvailability(expertCookie: string, date: string) {
    const response = await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expertCookie)
      .send({
        rules: [
          {
            weekday: isoWeekday(date),
            startLocalTime: "09:00",
            endLocalTime: "11:00",
            timezone: "UTC",
            slotDurationMinutes: 30,
            effectiveFrom: date,
            effectiveUntil: null,
            isActive: true,
          },
        ],
      });

    expect(response.status).toBe(200);
  }

  async function requestBooking(
    candidateCookie: string,
    expertProfileId: string,
    startsAt: string,
    idempotencyKey?: string,
  ) {
    const call = request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Cookie", candidateCookie)
      .send({ expertProfileId, startsAt });

    if (idempotencyKey) {
      call.set("Idempotency-Key", idempotencyKey);
    }

    return call;
  }

  it("creates a booking and its reservation together", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const candidate = await register("candidate@example.com");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const response = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
      "booking-request-0001",
    );

    expect(response.status).toBe(201);
    expect(response.body.booking).toMatchObject({
      status: "PENDING_EXPERT_APPROVAL",
      startsAt,
      endsAt: `${date}T09:30:00.000Z`,
      timezone: "UTC",
      durationMinutes: 30,
      paymentDeadline: null,
      expert: {
        id: expert.profile.id,
        name: "Booking Tester",
      },
      candidate: {
        id: candidate.userId,
        name: "Booking Tester",
      },
      reservation: { status: "HELD" },
    });
    expect(response.body.booking.history).toEqual([
      expect.objectContaining({
        fromStatus: null,
        toStatus: "PENDING_EXPERT_APPROVAL",
        reason: "Booking requested.",
      }),
    ]);

    const deadline = new Date(
      response.body.booking.expertResponseDeadline,
    ).getTime();
    expect(deadline).toBeGreaterThan(Date.now() + 119 * 60_000);
    expect(deadline).toBeLessThan(Date.now() + 121 * 60_000);

    const stored = await prisma.booking.findUniqueOrThrow({
      where: { id: response.body.booking.id },
      include: { reservation: true },
    });
    expect(stored.reservation?.bookingId).toBe(stored.id);
    expect(stored.reservation?.expiresAt).toEqual(
      stored.expertResponseDeadline,
    );

    const repeat = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
      "booking-request-0001",
    );
    expect(repeat.status).toBe(201);
    expect(repeat.body.booking.id).toBe(response.body.booking.id);
    expect(await prisma.booking.count()).toBe(1);

    const held = await request(app.getHttpServer()).get(
      `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${date}`,
    );
    expect(
      held.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).not.toContain(startsAt);
  });

  it("prevents two candidates from claiming the same slot", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const first = await register("first@example.com", "First Candidate");
    const second = await register("second@example.com", "Second Candidate");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const responses = await Promise.all([
      requestBooking(first.cookie, expert.profile.id, startsAt),
      requestBooking(second.cookie, expert.profile.id, startsAt),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const rejected = responses.find((response) => response.status === 409);
    expect(rejected?.body.error.code).toBe("SLOT_UNAVAILABLE");
    expect(await prisma.booking.count()).toBe(1);
    expect(await prisma.slotReservation.count()).toBe(1);
  });

  it("lets only the assigned expert approve and sets the payment deadline", async () => {
    const expert = await createExpert({
      email: "expert@example.com",
      name: "Assigned Expert",
    });
    const otherExpert = await createExpert({
      email: "other@example.com",
      name: "Other Expert",
    });
    const candidate = await register("candidate@example.com");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
    );
    const bookingId = created.body.booking.id as string;

    const foreign = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", otherExpert.cookie);
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe("BOOKING_NOT_FOUND");

    const candidateAttempt = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", candidate.cookie);
    expect(candidateAttempt.status).toBe(403);

    const anonymous = await request(app.getHttpServer()).post(
      `/api/v1/bookings/${bookingId}/approve`,
    );
    expect(anonymous.status).toBe(401);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", expert.cookie);

    expect(approved.status).toBe(200);
    expect(approved.body.booking.status).toBe("APPROVED_PENDING_PAYMENT");
    expect(approved.body.booking.paymentDeadline).not.toBeNull();
    expect(approved.body.booking.reservation.status).toBe("HELD");
    expect(new Date(approved.body.booking.reservation.expiresAt)).toEqual(
      new Date(approved.body.booking.paymentDeadline),
    );

    const paymentDeadline = new Date(
      approved.body.booking.paymentDeadline,
    ).getTime();
    expect(paymentDeadline).toBeGreaterThan(Date.now() + 59 * 60_000);
    expect(paymentDeadline).toBeLessThan(Date.now() + 61 * 60_000);

    const repeated = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", expert.cookie);
    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe("BOOKING_NOT_PENDING");
  });

  it("rejects an expired request and releases its reservation", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const candidate = await register("candidate@example.com");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
    );
    const bookingId = created.body.booking.id as string;

    await prisma.booking.update({
      where: { id: bookingId },
      data: { expertResponseDeadline: new Date(Date.now() - 60_000) },
    });

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", expert.cookie);

    expect(approved.status).toBe(409);
    expect(approved.body.error.code).toBe("BOOKING_EXPIRED");

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { reservation: true },
    });
    expect(booking.status).toBe("EXPIRED");
    expect(booking.reservation?.status).toBe("EXPIRED");

    const reopened = await request(app.getHttpServer()).get(
      `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${date}`,
    );
    expect(
      reopened.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).toContain(startsAt);
  });

  it("declines a request, records the reason, and frees the slot", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const candidate = await register("candidate@example.com");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T10:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
    );
    const bookingId = created.body.booking.id as string;

    const declined = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/decline`)
      .set("Cookie", expert.cookie)
      .send({ reason: "I have a conflict at that time." });

    expect(declined.status).toBe(200);
    expect(declined.body.booking.status).toBe("DECLINED");
    expect(declined.body.booking.reservation.status).toBe("RELEASED");
    expect(declined.body.booking.history.at(-1)).toMatchObject({
      fromStatus: "PENDING_EXPERT_APPROVAL",
      toStatus: "DECLINED",
      reason: "I have a conflict at that time.",
    });

    const reopened = await request(app.getHttpServer()).get(
      `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${date}`,
    );
    expect(
      reopened.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).toContain(startsAt);
  });

  it("expires an unpaid approval lazily and releases the slot", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const candidate = await register("candidate@example.com");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:30:00.000Z`;

    await addAvailability(expert.cookie, date);

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
    );
    const bookingId = created.body.booking.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", expert.cookie)
      .expect(200);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentDeadline: new Date(Date.now() - 60_000) },
    });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set("Cookie", candidate.cookie);

    expect(detail.status).toBe(200);
    expect(detail.body.booking.status).toBe("EXPIRED");
    expect(detail.body.booking.reservation.status).toBe("EXPIRED");
    expect(detail.body.booking.history.at(-1)).toMatchObject({
      fromStatus: "APPROVED_PENDING_PAYMENT",
      toStatus: "EXPIRED",
      reason: "The payment deadline passed.",
    });

    const reopened = await request(app.getHttpServer()).get(
      `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${date}`,
    );
    expect(
      reopened.body.slots.map((slot: { startsAt: string }) => slot.startsAt),
    ).toContain(startsAt);
  });

  it("protects booking lists and details by participant", async () => {
    const expert = await createExpert({ email: "expert@example.com" });
    const candidate = await register("candidate@example.com");
    const stranger = await register("stranger@example.com", "Stranger");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
    );
    const bookingId = created.body.booking.id as string;

    const own = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set("Cookie", candidate.cookie);
    expect(own.status).toBe(200);

    const expertView = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set("Cookie", expert.cookie);
    expect(expertView.status).toBe(200);

    const hidden = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set("Cookie", stranger.cookie);
    expect(hidden.status).toBe(404);

    const candidateList = await request(app.getHttpServer())
      .get("/api/v1/bookings?as=candidate")
      .set("Cookie", candidate.cookie);
    expect(candidateList.status).toBe(200);
    expect(candidateList.body.bookings).toHaveLength(1);

    const expertList = await request(app.getHttpServer())
      .get("/api/v1/bookings?as=expert")
      .set("Cookie", expert.cookie);
    expect(expertList.status).toBe(200);
    expect(expertList.body.bookings).toHaveLength(1);

    const strangerList = await request(app.getHttpServer())
      .get("/api/v1/bookings?as=candidate")
      .set("Cookie", stranger.cookie);
    expect(strangerList.body.bookings).toEqual([]);

    const hiddenBookings = await request(app.getHttpServer()).get(
      "/api/v1/bookings",
    );
    expect(hiddenBookings.status).toBe(401);
  });
});
