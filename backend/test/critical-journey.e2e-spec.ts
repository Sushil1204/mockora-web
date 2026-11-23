import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import {
  addDays,
  formatIsoDate,
  isoWeekday,
} from "../src/availability/timezone";
import { InterviewSessionsService } from "../src/interviews/interview-sessions.service";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Critical candidate journey (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let interviews: InterviewSessionsService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    interviews = app.get(InterviewSessionsService);
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
    expect(response.status).toBe(201);

    return {
      userId: response.body.user.id as string,
      cookie: getCookieHeader(response.headers["set-cookie"]),
    };
  }

  async function createAdmin() {
    const account = await register("admin@example.com", "Operations Admin");
    await prisma.userRole.create({
      data: { userId: account.userId, role: "ADMIN", status: "ACTIVE" },
    });
    return account;
  }

  async function createSubmittedExpert() {
    const account = await register("expert@example.com", "Assigned Expert");
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
        verificationStatus: "SUBMITTED",
        publicationStatus: "UNPUBLISHED",
      },
    });

    return { ...account, profile };
  }

  it("runs candidate discovery through interview, feedback, review, and payout", async () => {
    const admin = await createAdmin();
    const expert = await createSubmittedExpert();
    const candidate = await register("candidate@example.com", "Candidate");

    const profile = await request(app.getHttpServer())
      .put("/api/v1/candidate/profile")
      .set("Cookie", candidate.cookie)
      .send({ careerStage: "MID_CAREER" });
    expect(profile.status).toBe(200);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/admin/experts/${expert.profile.id}/approve`)
      .set("Cookie", admin.cookie)
      .send({ notes: "Application reviewed and approved." });
    expect(approved.status).toBe(200);
    expect(approved.body.application).toMatchObject({
      verificationStatus: "APPROVED",
      publicationStatus: "PUBLISHED",
    });

    const marketplace = await request(app.getHttpServer()).get(
      "/api/v1/experts",
    );
    expect(marketplace.status).toBe(200);
    expect(marketplace.body.experts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expert.profile.id }),
      ]),
    );

    const date = addDays(formatIsoDate(new Date()), 2);
    const startsAt = `${date}T09:00:00.000Z`;
    const availability = await request(app.getHttpServer())
      .put("/api/v1/expert/availability/rules")
      .set("Cookie", expert.cookie)
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
    expect(availability.status).toBe(200);

    const pricing = await request(app.getHttpServer())
      .post("/api/v1/admin/pricing-rules")
      .set("Cookie", admin.cookie)
      .send({
        durationMinutes: 30,
        candidatePriceAmount: 399,
        expertPayoutAmount: 260,
        currency: "INR",
        effectiveFrom: new Date(Date.now() - 60_000).toISOString(),
      });
    expect(pricing.status).toBe(201);

    const booking = await request(app.getHttpServer())
      .post("/api/v1/bookings")
      .set("Cookie", candidate.cookie)
      .send({ expertProfileId: expert.profile.id, startsAt });
    expect(booking.status).toBe(201);
    const bookingId = booking.body.booking.id as string;
    expect(booking.body.booking).toMatchObject({
      status: "PENDING_EXPERT_APPROVAL",
      priceAmount: 399,
      expertPayoutAmount: 260,
      platformAmount: 139,
      currency: "INR",
    });

    const approval = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/approve`)
      .set("Cookie", expert.cookie);
    expect(approval.status).toBe(200);
    expect(approval.body.booking.status).toBe("APPROVED_PENDING_PAYMENT");

    const attempt = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/payment-attempts`)
      .set("Cookie", candidate.cookie);
    expect(attempt.status).toBe(201);
    expect(attempt.body.payment).toMatchObject({
      amount: 399,
      currency: "INR",
      status: "PENDING",
    });

    const payment = await request(app.getHttpServer())
      .post(`/api/v1/payments/${attempt.body.payment.id}/mock-result`)
      .set("Cookie", candidate.cookie)
      .send({ outcome: "SUCCESS" });
    expect(payment.status).toBe(200);
    expect(payment.body.payment.status).toBe("SUCCEEDED");

    const confirmed = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${bookingId}`)
      .set("Cookie", candidate.cookie);
    expect(confirmed.body.booking.status).toBe("CONFIRMED");

    const now = new Date();
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startsAt: new Date(now.getTime() - 5 * 60_000),
        endsAt: new Date(now.getTime() + 25 * 60_000),
      },
    });

    const token = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/interview-session/token`)
      .set("Cookie", candidate.cookie);
    expect(token.status).toBe(200);
    expect(token.body.interview).toMatchObject({
      provider: "STREAM_VIDEO",
      status: "IN_PROGRESS",
      canJoin: true,
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startsAt: new Date(now.getTime() - 60 * 60_000),
        endsAt: new Date(now.getTime() - 30 * 60_000),
      },
    });
    expect(await interviews.closeElapsedSessions(now)).toBe(1);

    const template = await prisma.feedbackTemplate.create({
      data: {
        name: "Critical journey template",
        version: 1,
        criteria: {
          create: [
            {
              name: "Technical knowledge",
              weight: 1,
              sortOrder: 1,
            },
            {
              name: "Communication",
              weight: 1,
              sortOrder: 2,
            },
          ],
        },
      },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });

    const feedback = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/feedback`)
      .set("Cookie", expert.cookie)
      .send({
        templateId: template.id,
        scores: template.criteria.map((criterion, index) => ({
          criterionId: criterion.id,
          score: index === 0 ? 5 : 4,
          evidenceComment: "Supported by a concrete production example.",
        })),
        overallSummary:
          "A well-prepared interview with clear examples and steady reasoning.",
        strengths: "Explains trade-offs clearly and structures answers well.",
        improvementAreas:
          "Add measurable outcomes when describing past projects.",
      });
    expect(feedback.status).toBe(201);
    expect(feedback.body.feedback.averageScore).toBe(4.5);

    const review = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/review`)
      .set("Cookie", candidate.cookie)
      .send({ rating: 5, comment: "Very useful and actionable session." });
    expect(review.status).toBe(201);

    const reports = await request(app.getHttpServer())
      .get("/api/v1/candidate/reports")
      .set("Cookie", candidate.cookie);
    expect(reports.status).toBe(200);
    expect(reports.body.reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookingId,
          review: expect.objectContaining({ rating: 5 }),
        }),
      ]),
    );

    const payout = await prisma.payout.findUniqueOrThrow({
      where: { bookingId },
    });
    expect(payout).toMatchObject({
      amount: 260,
      currency: "INR",
      status: "ELIGIBLE",
    });

    const completed = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { history: true },
    });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.history.at(-1)).toMatchObject({
      fromStatus: "COMPLETED_PENDING_FEEDBACK",
      toStatus: "COMPLETED",
    });
  });
});
