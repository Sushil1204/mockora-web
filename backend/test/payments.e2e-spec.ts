import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import request from "supertest";

import { AppException } from "../src/common/errors/app.exception";
import {
  addDays,
  formatIsoDate,
  isoWeekday,
} from "../src/availability/timezone";
import { MockPaymentProvider } from "../src/payments/providers/mock-payment.provider";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Mock payments (e2e)", () => {
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

  async function register(email: string, name = "Payment Tester") {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, name });

    return {
      userId: response.body.user.id as string,
      cookie: getCookieHeader(response.headers["set-cookie"]),
    };
  }

  async function createExpert(email: string, name = "Payment Expert") {
    const account = await register(email, name);

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
        timezone: "UTC",
        introduction: "Experienced interviewer and coach.",
        yearsExperience: 8,
        verificationStatus: "APPROVED",
        publicationStatus: "PUBLISHED",
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
  ) {
    return request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Cookie", candidateCookie)
      .send({ expertProfileId, startsAt });
  }

  async function createApprovedBooking() {
    const expert = await createExpert("expert@example.com", "Assigned Expert");
    const candidate = await register("candidate@example.com", "Candidate");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
    );
    expect(created.status).toBe(201);

    const bookingId = created.body.booking.id as string;
    const approved = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", expert.cookie);
    expect(approved.status).toBe(200);

    return { expert, candidate, bookingId, date, startsAt };
  }

  function createAttempt(
    candidateCookie: string,
    bookingId: string,
    idempotencyKey?: string,
  ) {
    const call = request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/payment-attempts`)
      .set("Cookie", candidateCookie);

    if (idempotencyKey) {
      call.set("Idempotency-Key", idempotencyKey);
    }

    return call;
  }

  function applyMockResult(
    cookie: string,
    paymentId: string,
    outcome: "SUCCESS" | "FAILURE",
    failureReason?: string,
  ) {
    return request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/mock-result`)
      .set("Cookie", cookie)
      .send({ outcome, ...(failureReason ? { failureReason } : {}) });
  }

  it("creates a reusable pending attempt and protects its status", async () => {
    const { candidate, bookingId } = await createApprovedBooking();

    const created = await createAttempt(
      candidate.cookie,
      bookingId,
      "payment-attempt-0001",
    );

    expect(created.status).toBe(201);
    expect(created.body.payment).toMatchObject({
      bookingId,
      provider: "MOCK",
      status: "PENDING",
      amount: null,
      currency: null,
      paidAt: null,
      isSimulated: true,
    });
    expect(created.body.payment.providerReference).toMatch(/^mock_/);

    const repeated = await createAttempt(
      candidate.cookie,
      bookingId,
      "payment-attempt-0001",
    );
    expect(repeated.status).toBe(201);
    expect(repeated.body.payment.id).toBe(created.body.payment.id);

    const withoutKey = await createAttempt(candidate.cookie, bookingId);
    expect(withoutKey.status).toBe(201);
    expect(withoutKey.body.payment.id).toBe(created.body.payment.id);
    expect(await prisma.payment.count()).toBe(1);

    const own = await request(app.getHttpServer())
      .get(`/api/v1/payments/${created.body.payment.id}`)
      .set("Cookie", candidate.cookie);
    expect(own.status).toBe(200);
    expect(own.body.payment.status).toBe("PENDING");

    const stranger = await register("stranger@example.com", "Stranger");
    const hidden = await request(app.getHttpServer())
      .get(`/api/v1/payments/${created.body.payment.id}`)
      .set("Cookie", stranger.cookie);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe("PAYMENT_NOT_FOUND");

    const anonymous = await request(app.getHttpServer()).get(
      `/api/v1/payments/${created.body.payment.id}`,
    );
    expect(anonymous.status).toBe(401);
  });

  it("confirms the booking exactly once after a successful mock payment", async () => {
    const { candidate, expert, bookingId, date, startsAt } =
      await createApprovedBooking();
    const attempt = await createAttempt(candidate.cookie, bookingId);
    const paymentId = attempt.body.payment.id as string;

    const result = await applyMockResult(
      candidate.cookie,
      paymentId,
      "SUCCESS",
    );

    expect(result.status).toBe(200);
    expect(result.body.payment).toMatchObject({
      id: paymentId,
      status: "SUCCEEDED",
      isSimulated: true,
    });
    expect(result.body.payment.paidAt).not.toBeNull();

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { reservation: true, history: true },
    });
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.confirmedAt).not.toBeNull();
    expect(booking.reservation?.status).toBe("CONSUMED");
    expect(booking.history.at(-1)).toMatchObject({
      fromStatus: "APPROVED_PENDING_PAYMENT",
      toStatus: "CONFIRMED",
      reason: "Mock payment succeeded; booking confirmed.",
    });

    const repeated = await applyMockResult(
      candidate.cookie,
      paymentId,
      "SUCCESS",
    );
    expect(repeated.status).toBe(200);
    expect(repeated.body.payment.id).toBe(paymentId);
    expect(
      await prisma.bookingStatusHistory.count({
        where: { bookingId, toStatus: "CONFIRMED" },
      }),
    ).toBe(1);
    expect(await prisma.payment.count()).toBe(1);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set("Cookie", candidate.cookie);
    expect(detail.body.booking.status).toBe("CONFIRMED");
    expect(detail.body.booking.confirmedAt).not.toBeNull();

    const availability = await request(app.getHttpServer()).get(
      `/api/v1/experts/${expert.profile.id}/availability?from=${date}&to=${date}`,
    );
    expect(
      availability.body.slots.map(
        (slot: { startsAt: string }) => slot.startsAt,
      ),
    ).not.toContain(startsAt);

    const afterConfirmation = await createAttempt(candidate.cookie, bookingId);
    expect(afterConfirmation.status).toBe(409);
    expect(afterConfirmation.body.error.code).toBe("BOOKING_NOT_PAYABLE");
  });

  it("records a failed mock payment and allows another attempt", async () => {
    const { candidate, bookingId } = await createApprovedBooking();
    const first = await createAttempt(candidate.cookie, bookingId);

    const failed = await applyMockResult(
      candidate.cookie,
      first.body.payment.id,
      "FAILURE",
      "Simulated card decline.",
    );

    expect(failed.status).toBe(200);
    expect(failed.body.payment).toMatchObject({
      status: "FAILED",
      failureReason: "Simulated card decline.",
      paidAt: null,
    });

    const afterFailure = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { reservation: true },
    });
    expect(afterFailure.status).toBe("APPROVED_PENDING_PAYMENT");
    expect(afterFailure.confirmedAt).toBeNull();
    expect(afterFailure.reservation?.status).toBe("HELD");

    const retry = await createAttempt(candidate.cookie, bookingId);
    expect(retry.status).toBe(201);
    expect(retry.body.payment.id).not.toBe(first.body.payment.id);
    expect(retry.body.payment.status).toBe("PENDING");

    const success = await applyMockResult(
      candidate.cookie,
      retry.body.payment.id,
      "SUCCESS",
    );
    expect(success.status).toBe(200);
    expect(success.body.payment.status).toBe("SUCCEEDED");

    expect(await prisma.payment.count({ where: { bookingId } })).toBe(2);
    expect(
      await prisma.payment.count({ where: { bookingId, status: "FAILED" } }),
    ).toBe(1);
    expect(
      await prisma.payment.count({
        where: { bookingId, status: "SUCCEEDED" },
      }),
    ).toBe(1);
  });

  it("rejects payment after the deadline and cancels the attempt", async () => {
    const { candidate, bookingId } = await createApprovedBooking();
    const attempt = await createAttempt(candidate.cookie, bookingId);
    const paymentId = attempt.body.payment.id as string;

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentDeadline: new Date(Date.now() - 60_000) },
    });

    const result = await applyMockResult(
      candidate.cookie,
      paymentId,
      "SUCCESS",
    );
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("BOOKING_EXPIRED");

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { reservation: true },
    });
    expect(booking.status).toBe("EXPIRED");
    expect(booking.reservation?.status).toBe("EXPIRED");

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    expect(payment.status).toBe("CANCELLED");
    expect(payment.failureReason).toBe(
      "Booking expired before payment completed.",
    );

    const lateAttempt = await createAttempt(candidate.cookie, bookingId);
    expect(lateAttempt.status).toBe(409);
    expect(lateAttempt.body.error.code).toBe("BOOKING_EXPIRED");
    expect(await prisma.payment.count({ where: { bookingId } })).toBe(1);
  });

  it("requires an approved booking and the owning candidate", async () => {
    const expert = await createExpert("expert@example.com");
    const candidate = await register("candidate@example.com");
    const other = await register("other@example.com", "Other Candidate");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;

    await addAvailability(expert.cookie, date);

    const created = await requestBooking(
      candidate.cookie,
      expert.profile.id,
      startsAt,
    );
    const pendingBookingId = created.body.booking.id as string;

    const pending = await createAttempt(candidate.cookie, pendingBookingId);
    expect(pending.status).toBe(409);
    expect(pending.body.error.code).toBe("BOOKING_NOT_PAYABLE");

    const expertAttempt = await createAttempt(expert.cookie, pendingBookingId);
    expect(expertAttempt.status).toBe(404);
    expect(expertAttempt.body.error.code).toBe("BOOKING_NOT_FOUND");

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${pendingBookingId}/approve`)
      .set("Cookie", expert.cookie)
      .expect(200);

    const attempt = await createAttempt(candidate.cookie, pendingBookingId);
    expect(attempt.status).toBe(201);

    const foreign = await applyMockResult(
      other.cookie,
      attempt.body.payment.id,
      "SUCCESS",
    );
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe("PAYMENT_NOT_FOUND");

    const expertResult = await applyMockResult(
      expert.cookie,
      attempt.body.payment.id,
      "SUCCESS",
    );
    expect(expertResult.status).toBe(404);

    const anonymous = await request(app.getHttpServer())
      .post(`/api/v1/payments/${attempt.body.payment.id}/mock-result`)
      .send({ outcome: "SUCCESS" });
    expect(anonymous.status).toBe(401);

    const stillPending = await prisma.payment.findUniqueOrThrow({
      where: { id: attempt.body.payment.id },
    });
    expect(stillPending.status).toBe("PENDING");
  });

  it("rejects invalid mock input and operators in production", async () => {
    const provider = new MockPaymentProvider(
      new ConfigService({
        NODE_ENV: "production",
        PAYMENT_PROVIDER: "mock",
      }),
    );

    try {
      provider.assertEnabled();
      throw new Error("Expected mock payments to be disabled.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe("MOCK_PAYMENT_UNAVAILABLE");
      expect((error as AppException).getStatus()).toBe(404);
    }

    const { candidate, bookingId } = await createApprovedBooking();
    const attempt = await createAttempt(candidate.cookie, bookingId);

    const invalid = await request(app.getHttpServer())
      .post(`/api/v1/payments/${attempt.body.payment.id}/mock-result`)
      .set("Cookie", candidate.cookie)
      .send({ outcome: "MAYBE" });
    expect(invalid.status).toBe(400);

    const unknown = await applyMockResult(
      candidate.cookie,
      "9f2a9d10-6f20-4d43-9f5f-1f66b30e5a17",
      "SUCCESS",
    );
    expect(unknown.status).toBe(404);
  });
});
