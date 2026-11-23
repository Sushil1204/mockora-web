import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Admin operations (e2e)", () => {
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

  async function register(email: string, name: string) {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, name });

    return {
      userId: response.body.user.id as string,
      cookie: getCookieHeader(response.headers["set-cookie"]),
    };
  }

  async function createAdmin(email = "admin@example.com") {
    const account = await register(email, "Operations Admin");
    await prisma.userRole.create({
      data: { userId: account.userId, role: "ADMIN", status: "ACTIVE" },
    });
    return account;
  }

  async function createExpert(email = "expert@example.com") {
    const account = await register(email, "Assigned Expert");
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

  it("protects admin endpoints and audits role grants", async () => {
    const candidate = await register("candidate@example.com", "Candidate");
    const admin = await createAdmin();
    const target = await register("target@example.com", "Target User");

    const anonymous = await request(app.getHttpServer()).get(
      "/api/v1/admin/analytics",
    );
    expect(anonymous.status).toBe(401);

    const forbidden = await request(app.getHttpServer())
      .get("/api/v1/admin/analytics")
      .set("Cookie", candidate.cookie);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .get("/api/v1/admin/analytics")
      .set("Cookie", admin.cookie);
    expect(allowed.status).toBe(200);
    expect(allowed.body.users).toMatchObject({
      candidates: expect.any(Number),
      approvedExperts: 0,
      pendingApplications: 0,
    });

    const grant = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${target.userId}/roles`)
      .set("Cookie", admin.cookie)
      .send({ role: "EXPERT" });
    expect(grant.status).toBe(200);
    expect(grant.body.user.roles).toContain("EXPERT");

    const audit = await request(app.getHttpServer())
      .get("/api/v1/admin/audit-logs")
      .set("Cookie", admin.cookie);
    expect(audit.status).toBe(200);
    expect(audit.body.logs[0]).toMatchObject({
      action: "USER_ROLE_GRANTED",
      entityType: "USER",
      entityId: target.userId,
      actor: { id: admin.userId },
    });
  });

  it("configures pricing and snapshots it on new bookings only", async () => {
    const admin = await createAdmin();
    const expert = await createExpert();
    const candidate = await register("candidate@example.com", "Candidate");
    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;
    await addAvailability(expert.cookie, date);

    const created = await request(app.getHttpServer())
      .post("/api/v1/admin/pricing-rules")
      .set("Cookie", admin.cookie)
      .send({
        durationMinutes: 30,
        candidatePriceAmount: 399,
        expertPayoutAmount: 260,
        currency: "INR",
        effectiveFrom: new Date(Date.now() - 60_000).toISOString(),
      });
    expect(created.status).toBe(201);
    expect(created.body.rule).toMatchObject({
      durationMinutes: 30,
      candidatePriceAmount: 399,
      expertPayoutAmount: 260,
      platformAmount: 139,
      commissionPercent: 34.8,
      isActive: true,
    });

    const overlap = await request(app.getHttpServer())
      .post("/api/v1/admin/pricing-rules")
      .set("Cookie", admin.cookie)
      .send({
        durationMinutes: 30,
        candidatePriceAmount: 449,
        expertPayoutAmount: 300,
        currency: "INR",
      });
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe("PRICING_RULE_OVERLAP");

    const booking = await request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Cookie", candidate.cookie)
      .send({ expertProfileId: expert.profile.id, startsAt });
    expect(booking.status).toBe(201);
    expect(booking.body.booking).toMatchObject({
      durationMinutes: 30,
      priceAmount: 399,
      expertPayoutAmount: 260,
      platformAmount: 139,
      currency: "INR",
    });

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/admin/pricing-rules/${created.body.rule.id}`)
      .set("Cookie", admin.cookie)
      .send({ candidatePriceAmount: 499, expertPayoutAmount: 300 });
    expect(updated.status).toBe(200);
    expect(updated.body.rule.platformAmount).toBe(199);

    const stored = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.body.booking.id },
    });
    expect(stored.priceAmount).toBe(399);
    expect(stored.expertPayoutAmount).toBe(260);

    const audit = await prisma.auditLog.findMany({
      where: { entityType: "PRICING_RULE" },
    });
    expect(audit.map((entry) => entry.action).sort()).toEqual([
      "PRICING_RULE_CREATED",
      "PRICING_RULE_UPDATED",
    ]);
  });

  it("cancels a paid booking with a manual refund and audits it", async () => {
    const admin = await createAdmin();
    const expert = await createExpert();
    const candidate = await register("candidate@example.com", "Candidate");
    const startsAt = new Date(Date.now() + 2 * 60 * 60_000);
    const booking = await prisma.booking.create({
      data: {
        candidateUserId: candidate.userId,
        expertProfileId: expert.profile.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60_000),
        timezone: "UTC",
        durationMinutes: 30,
        priceAmount: 399,
        currency: "INR",
        expertPayoutAmount: 260,
        platformAmount: 139,
        status: "CONFIRMED",
        expertResponseDeadline: new Date(),
        confirmedAt: new Date(),
      },
    });
    await prisma.slotReservation.create({
      data: {
        expertProfileId: expert.profile.id,
        candidateUserId: candidate.userId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60_000),
        status: "HELD",
        expiresAt: startsAt,
        bookingId: booking.id,
      },
    });
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: 399,
        currency: "INR",
        status: "SUCCEEDED",
        paidAt: new Date(),
        providerPaymentReference: `mock-${booking.id}`,
      },
    });

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/admin/bookings/${booking.id}/cancel`)
      .set("Cookie", admin.cookie)
      .send({
        reason: "Expert reported an emergency; refund the candidate in full.",
        refundAmount: 399,
      });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.booking).toMatchObject({
      status: "CANCELLED",
      refundedAmount: 399,
    });

    const storedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(storedPayment.status).toBe("REFUNDED");
    const refund = await prisma.refund.findFirstOrThrow({
      where: { bookingId: booking.id },
    });
    expect(refund).toMatchObject({
      amount: 399,
      currency: "INR",
      recordedById: admin.userId,
    });
    const reservation = await prisma.slotReservation.findUniqueOrThrow({
      where: { bookingId: booking.id },
    });
    expect(reservation.status).toBe("RELEASED");

    const secondCancel = await request(app.getHttpServer())
      .post(`/api/v1/admin/bookings/${booking.id}/cancel`)
      .set("Cookie", admin.cookie)
      .send({ reason: "Trying again.", refundAmount: 0 });
    expect(secondCancel.status).toBe(409);

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: "BOOKING_CANCELLED_BY_ADMIN" },
    });
    expect(audit.afterState).toMatchObject({
      status: "CANCELLED",
      refundAmount: 399,
    });
  });

  it("marks eligible payouts paid and exposes feedback, analytics, and suspension", async () => {
    const admin = await createAdmin();
    const expert = await createExpert();
    const candidate = await register("candidate@example.com", "Candidate");
    const template = await prisma.feedbackTemplate.create({
      data: {
        name: "Admin QA template",
        version: 1,
        criteria: {
          create: [
            {
              name: "Technical knowledge",
              weight: 1,
              sortOrder: 1,
            },
          ],
        },
      },
      include: { criteria: true },
    });
    const startsAt = new Date(Date.now() - 2 * 60 * 60_000);
    const booking = await prisma.booking.create({
      data: {
        candidateUserId: candidate.userId,
        expertProfileId: expert.profile.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60_000),
        timezone: "UTC",
        durationMinutes: 30,
        priceAmount: 399,
        currency: "INR",
        expertPayoutAmount: 260,
        platformAmount: 139,
        status: "COMPLETED",
        expertResponseDeadline: startsAt,
        confirmedAt: startsAt,
        completedAt: new Date(),
      },
    });
    await prisma.feedbackReport.create({
      data: {
        bookingId: booking.id,
        expertUserId: expert.userId,
        templateId: template.id,
        overallSummary: "Clear feedback with concrete evidence and next steps.",
        strengths: "Structured answers and good trade-off reasoning.",
        improvementAreas: "Quantify impact in project stories.",
        submittedAt: new Date(),
        scores: {
          create: {
            criterionId: template.criteria[0].id,
            score: 5,
            evidenceComment: "Used a concrete production example.",
          },
        },
      },
    });
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        candidateUserId: candidate.userId,
        expertProfileId: expert.profile.id,
        rating: 5,
        comment: "Very useful session.",
      },
    });
    const payout = await prisma.payout.create({
      data: {
        expertProfileId: expert.profile.id,
        bookingId: booking.id,
        amount: 260,
        currency: "INR",
        status: "ELIGIBLE",
        eligibleAt: new Date(),
      },
    });

    const feedback = await request(app.getHttpServer())
      .get("/api/v1/admin/feedback")
      .set("Cookie", admin.cookie);
    expect(feedback.status).toBe(200);
    expect(feedback.body.reports).toHaveLength(1);
    expect(feedback.body.reports[0]).toMatchObject({
      averageScore: 5,
      candidate: { id: candidate.userId },
      review: { rating: 5 },
    });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/feedback/${feedback.body.reports[0].id}`)
      .set("Cookie", admin.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.report.scores[0]).toMatchObject({
      name: "Technical knowledge",
      score: 5,
    });

    const markPaid = await request(app.getHttpServer())
      .post(`/api/v1/admin/payouts/${payout.id}/mark-paid`)
      .set("Cookie", admin.cookie)
      .send({ reason: "Recorded offline bank transfer." });
    expect(markPaid.status).toBe(200);
    expect(markPaid.body.payout).toMatchObject({
      status: "PAID",
      paidBy: { id: admin.userId },
    });

    const analytics = await request(app.getHttpServer())
      .get("/api/v1/admin/analytics")
      .set("Cookie", admin.cookie);
    expect(analytics.status).toBe(200);
    expect(analytics.body.bookings.completed).toBe(1);
    expect(analytics.body.feedback).toMatchObject({
      reports: 1,
      reviews: 1,
      averageRating: 5,
    });

    const suspended = await request(app.getHttpServer())
      .post(`/api/v1/admin/candidates/${candidate.userId}/suspend`)
      .set("Cookie", admin.cookie)
      .send({ reason: "Fraudulent booking activity under review." });
    expect(suspended.status).toBe(200);
    expect(suspended.body.candidate.accountStatus).toBe("SUSPENDED");

    const sessionRejected = await request(app.getHttpServer())
      .get("/api/v1/bookings")
      .set("Cookie", candidate.cookie);
    expect(sessionRejected.status).toBe(401);

    const reactivated = await request(app.getHttpServer())
      .post(`/api/v1/admin/candidates/${candidate.userId}/reactivate`)
      .set("Cookie", admin.cookie)
      .send({ reason: "Review complete; no policy violation." });
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.candidate.accountStatus).toBe("ACTIVE");
  });
});

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return formatIsoDate(value);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isoWeekday(date: string): number {
  const value = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return value === 0 ? 7 : value;
}
