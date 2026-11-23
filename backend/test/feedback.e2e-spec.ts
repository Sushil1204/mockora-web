import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { NotificationsService } from "../src/notifications/notifications.service";
import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Feedback and reviews (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notifications: NotificationsService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);
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

  async function createExpert(email: string, name: string) {
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

  async function createTemplate() {
    return prisma.feedbackTemplate.create({
      data: {
        name: "Test evaluation",
        version: 1,
        criteria: {
          create: [
            {
              name: "Technical knowledge",
              description: "Depth of knowledge.",
              weight: 1,
              sortOrder: 1,
            },
            {
              name: "Communication",
              description: "Clarity of explanation.",
              weight: 1,
              sortOrder: 2,
            },
          ],
        },
      },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async function createPendingFeedbackBooking(
    candidateUserId: string,
    expertProfileId: string,
  ) {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 90 * 60_000);
    const endsAt = new Date(now.getTime() - 60 * 60_000);

    return prisma.booking.create({
      data: {
        candidateUserId,
        expertProfileId,
        startsAt,
        endsAt,
        timezone: "UTC",
        durationMinutes: 30,
        status: "COMPLETED_PENDING_FEEDBACK",
        expertResponseDeadline: startsAt,
        confirmedAt: startsAt,
        history: {
          create: [
            {
              toStatus: "CONFIRMED",
              reason: "Booking confirmed.",
            },
            {
              fromStatus: "IN_PROGRESS",
              toStatus: "COMPLETED_PENDING_FEEDBACK",
              reason: "Interview ended at the scheduled time.",
            },
          ],
        },
      },
    });
  }

  function submissionBody(
    templateId: string,
    criteria: Array<{ id: string }>,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      templateId,
      scores: criteria.map((criterion, index) => ({
        criterionId: criterion.id,
        score: index === 0 ? 5 : 4,
        evidenceComment: "Explained with a concrete example.",
      })),
      overallSummary:
        "A well-prepared interview with clear, relevant examples and steady reasoning.",
      strengths: "Explains trade-offs clearly and structures answers well.",
      improvementAreas:
        "Add more measurable outcomes when describing past projects.",
      recommendations:
        "Practice two more system design interviews before the loop.",
      ...overrides,
    };
  }

  it("requires expert feedback before completing the booking and exposes the report", async () => {
    const template = await createTemplate();
    const expert = await createExpert("expert@example.com", "Assigned Expert");
    const candidate = await register("candidate@example.com", "Candidate");
    const booking = await createPendingFeedbackBooking(
      candidate.userId,
      expert.profile.id,
    );
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        priceAmount: 399,
        currency: "INR",
        expertPayoutAmount: 260,
        platformAmount: 139,
      },
    });

    const before = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", candidate.cookie);
    expect(before.status).toBe(200);
    expect(before.body.feedback).toBeNull();
    expect(before.body.canSubmit).toBe(false);

    const expertState = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", expert.cookie);
    expect(expertState.status).toBe(200);
    expect(expertState.body.canSubmit).toBe(true);
    expect(expertState.body.template).toMatchObject({
      id: template.id,
      name: "Test evaluation",
      version: 1,
    });
    expect(expertState.body.template.criteria).toHaveLength(2);

    const submitted = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", expert.cookie)
      .send(submissionBody(template.id, template.criteria));

    expect(submitted.status).toBe(201);
    expect(submitted.body.feedback).toMatchObject({
      bookingId: booking.id,
      averageScore: 4.5,
      overallSummary: expect.stringContaining("well-prepared"),
    });
    expect(submitted.body.feedback.criteria).toHaveLength(2);
    expect(submitted.body.feedback.criteria[0]).toMatchObject({
      name: "Technical knowledge",
      score: 5,
    });

    const stored = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: {
        feedbackReport: { include: { scores: true } },
        history: true,
        payout: true,
      },
    });
    expect(stored.status).toBe("COMPLETED");
    expect(stored.completedAt).not.toBeNull();
    expect(stored.feedbackReport?.scores).toHaveLength(2);
    expect(stored.history.at(-1)).toMatchObject({
      fromStatus: "COMPLETED_PENDING_FEEDBACK",
      toStatus: "COMPLETED",
    });
    expect(stored.payout).toMatchObject({
      amount: 260,
      currency: "INR",
      status: "ELIGIBLE",
    });

    const candidateReport = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", candidate.cookie);
    expect(candidateReport.status).toBe(200);
    expect(candidateReport.body.feedback.id).toBe(submitted.body.feedback.id);
    expect(candidateReport.body.canReview).toBe(true);
    expect(candidateReport.body.template).toBeNull();

    const notificationsForCandidate = await prisma.notification.findMany({
      where: { userId: candidate.userId, type: "FEEDBACK_SUBMITTED" },
    });
    expect(notificationsForCandidate).toHaveLength(1);

    const reports = await request(app.getHttpServer())
      .get("/api/v1/candidate/reports")
      .set("Cookie", candidate.cookie);
    expect(reports.status).toBe(200);
    expect(reports.body.reports).toHaveLength(1);
    expect(reports.body.reports[0]).toMatchObject({
      bookingId: booking.id,
      averageScore: 4.5,
      booking: { expert: { id: expert.profile.id } },
    });

    const duplicate = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", expert.cookie)
      .send(submissionBody(template.id, template.criteria));
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("FEEDBACK_ALREADY_SUBMITTED");
  });

  it("validates required scores and written fields", async () => {
    const template = await createTemplate();
    const expert = await createExpert("expert@example.com", "Assigned Expert");
    const candidate = await register("candidate@example.com", "Candidate");
    const booking = await createPendingFeedbackBooking(
      candidate.userId,
      expert.profile.id,
    );

    const missingScore = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", expert.cookie)
      .send(
        submissionBody(template.id, template.criteria, {
          scores: [
            {
              criterionId: template.criteria[0].id,
              score: 5,
            },
          ],
        }),
      );
    expect(missingScore.status).toBe(400);
    expect(missingScore.body.error.code).toBe("INVALID_FEEDBACK_SCORES");
    expect(missingScore.body.error.details.missingCriteria).toEqual([
      template.criteria[1].id,
    ]);

    const missingText = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", expert.cookie)
      .send(
        submissionBody(template.id, template.criteria, {
          improvementAreas: "",
        }),
      );
    expect(missingText.status).toBe(400);
    expect(missingText.body.error.code).toBe("VALIDATION_ERROR");

    const outOfRange = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", expert.cookie)
      .send(
        submissionBody(template.id, template.criteria, {
          scores: template.criteria.map((criterion) => ({
            criterionId: criterion.id,
            score: 6,
          })),
        }),
      );
    expect(outOfRange.status).toBe(400);

    const bookingStillPending = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(bookingStillPending.status).toBe("COMPLETED_PENDING_FEEDBACK");
    expect(await prisma.feedbackReport.count()).toBe(0);
  });

  it("enforces expert ownership and the feedback-pending status", async () => {
    const template = await createTemplate();
    const expert = await createExpert("expert@example.com", "Assigned Expert");
    const otherExpert = await createExpert(
      "other-expert@example.com",
      "Other Expert",
    );
    const candidate = await register("candidate@example.com", "Candidate");
    const booking = await createPendingFeedbackBooking(
      candidate.userId,
      expert.profile.id,
    );

    const stranger = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", otherExpert.cookie)
      .send(submissionBody(template.id, template.criteria));
    expect(stranger.status).toBe(404);
    expect(stranger.body.error.code).toBe("BOOKING_NOT_FOUND");

    const candidateAttempt = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", candidate.cookie)
      .send(submissionBody(template.id, template.criteria));
    expect(candidateAttempt.status).toBe(403);

    const unknownViewer = await register(
      "stranger@example.com",
      "Stranger Account",
    );
    const hidden = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", unknownViewer.cookie);
    expect(hidden.status).toBe(404);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "IN_PROGRESS" },
    });

    const early = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", expert.cookie)
      .send(submissionBody(template.id, template.criteria));
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe("FEEDBACK_NOT_AVAILABLE");
  });

  it("accepts one candidate review after the report and publishes it anonymously", async () => {
    const template = await createTemplate();
    const expert = await createExpert("expert@example.com", "Assigned Expert");
    const candidate = await register("candidate@example.com", "Candidate");
    const booking = await createPendingFeedbackBooking(
      candidate.userId,
      expert.profile.id,
    );

    const premature = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/review`)
      .set("Cookie", candidate.cookie)
      .send({ rating: 5, comment: "Excellent session." });
    expect(premature.status).toBe(409);
    expect(premature.body.error.code).toBe("FEEDBACK_REQUIRED");

    await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/feedback`)
      .set("Cookie", expert.cookie)
      .send(submissionBody(template.id, template.criteria))
      .expect(201);

    const invalidRating = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/review`)
      .set("Cookie", candidate.cookie)
      .send({ rating: 9, comment: "Excellent session." });
    expect(invalidRating.status).toBe(400);

    const created = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/review`)
      .set("Cookie", candidate.cookie)
      .send({ rating: 5, comment: "Excellent session and useful feedback." });
    expect(created.status).toBe(201);
    expect(created.body.review).toMatchObject({
      rating: 5,
      comment: "Excellent session and useful feedback.",
    });

    const duplicate = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${booking.id}/review`)
      .set("Cookie", candidate.cookie)
      .send({ rating: 4 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("REVIEW_ALREADY_SUBMITTED");

    const publicProfile = await request(app.getHttpServer()).get(
      `/api/v1/experts/${expert.profile.id}`,
    );
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.expert.reviews).toMatchObject({
      averageRating: 5,
      total: 1,
      items: [
        {
          rating: 5,
          comment: "Excellent session and useful feedback.",
        },
      ],
    });
    expect(JSON.stringify(publicProfile.body)).not.toContain("Candidate");
  });

  it("queues one deduplicated reminder for stale pending feedback", async () => {
    const expert = await createExpert("expert@example.com", "Assigned Expert");
    const candidate = await register("candidate@example.com", "Candidate");
    const now = new Date();
    const booking = await createPendingFeedbackBooking(
      candidate.userId,
      expert.profile.id,
    );

    await prisma.interviewSession.create({
      data: {
        bookingId: booking.id,
        providerSessionReference: `test-session-${booking.id}`,
        status: "ENDED",
        startedAt: new Date(now.getTime() - 2 * 60 * 60_000),
        endedAt: new Date(now.getTime() - 25 * 60 * 60_000),
      },
    });

    expect(await notifications.enqueueDueReminders(now)).toBe(1);
    expect(await notifications.enqueueDueReminders(now)).toBe(0);

    await notifications.dispatchPendingEvents();
    await notifications.deliverPendingNotifications();

    const reminders = await prisma.notification.findMany({
      where: { userId: expert.userId, type: "FEEDBACK_REMINDER" },
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.title).toBe("Feedback still pending");
  });
});
