import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { PublicUser } from "../auth/auth.types";
import { lockBooking } from "../bookings/booking-lock";
import { AppException } from "../common/errors/app.exception";
import { enqueueNotificationEvent } from "../notifications/notification-events";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import type {
  SubmitFeedbackInput,
  SubmitReviewInput,
} from "./feedback.schemas";

const feedbackReportInclude = {
  template: { select: { id: true, name: true, version: true } },
  scores: {
    include: {
      criterion: {
        select: {
          id: true,
          name: true,
          description: true,
          weight: true,
          sortOrder: true,
        },
      },
    },
    orderBy: { criterion: { sortOrder: "asc" as const } },
  },
} satisfies Prisma.FeedbackReportInclude;

type FeedbackReportRecord = Prisma.FeedbackReportGetPayload<{
  include: typeof feedbackReportInclude;
}>;

const feedbackBookingInclude = {
  expertProfile: { select: { id: true, userId: true } },
  feedbackReport: { include: feedbackReportInclude },
  review: true,
} satisfies Prisma.BookingInclude;

type FeedbackBooking = Prisma.BookingGetPayload<{
  include: typeof feedbackBookingInclude;
}>;

type FeedbackTemplateRecord = Prisma.FeedbackTemplateGetPayload<{
  include: { criteria: true };
}>;

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getFeedback(actor: PublicUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: feedbackBookingInclude,
    });

    if (!booking || !isParticipant(booking, actor.id)) {
      throw this.bookingNotFound();
    }

    const isExpert = booking.expertProfile.userId === actor.id;
    const canSubmit =
      isExpert &&
      booking.status === "COMPLETED_PENDING_FEEDBACK" &&
      !booking.feedbackReport;

    const template = canSubmit ? await this.activeTemplate() : null;

    return {
      feedback: booking.feedbackReport
        ? toReportResponse(booking.feedbackReport, booking.review)
        : null,
      template: template ? toTemplateResponse(template) : null,
      canSubmit,
      canReview:
        booking.candidateUserId === actor.id &&
        booking.status === "COMPLETED" &&
        Boolean(booking.feedbackReport) &&
        !booking.review,
      review: booking.review ? toReviewResponse(booking.review) : null,
    };
  }

  async submitFeedback(
    actor: PublicUser,
    bookingId: string,
    input: SubmitFeedbackInput,
  ) {
    const report = await this.prisma.$transaction(async (tx) => {
      await lockBooking(tx, bookingId);

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: feedbackBookingInclude,
      });

      if (!booking || booking.expertProfile.userId !== actor.id) {
        throw this.bookingNotFound();
      }

      if (booking.feedbackReport) {
        throw new AppException(
          "FEEDBACK_ALREADY_SUBMITTED",
          "Feedback has already been submitted for this interview.",
          HttpStatus.CONFLICT,
        );
      }

      if (booking.status !== "COMPLETED_PENDING_FEEDBACK") {
        throw new AppException(
          "FEEDBACK_NOT_AVAILABLE",
          "Feedback can be submitted only after the interview has ended.",
          HttpStatus.CONFLICT,
          { status: booking.status },
        );
      }

      const template = await tx.feedbackTemplate.findFirst({
        where: { id: input.templateId, isActive: true },
        include: { criteria: true },
      });

      if (!template) {
        throw this.templateUnavailable();
      }

      assertAllCriteriaScored(template, input);

      const now = new Date();
      const created = await tx.feedbackReport.create({
        data: {
          bookingId,
          expertUserId: actor.id,
          templateId: template.id,
          overallSummary: input.overallSummary,
          strengths: input.strengths,
          improvementAreas: input.improvementAreas,
          recommendations: input.recommendations?.trim() || null,
          submittedAt: now,
          scores: {
            create: input.scores.map((entry) => ({
              criterionId: entry.criterionId,
              score: entry.score,
              evidenceComment: entry.evidenceComment?.trim() || null,
            })),
          },
        },
        include: feedbackReportInclude,
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED", completedAt: now },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: "COMPLETED_PENDING_FEEDBACK",
          toStatus: "COMPLETED",
          changedByUserId: actor.id,
          reason: "Expert submitted the feedback report.",
        },
      });

      if (booking.expertPayoutAmount !== null && booking.currency) {
        await tx.payout.create({
          data: {
            expertProfileId: booking.expertProfile.id,
            bookingId,
            amount: booking.expertPayoutAmount,
            currency: booking.currency,
            status: "ELIGIBLE",
            eligibleAt: now,
          },
        });
      }

      await enqueueNotificationEvent(tx, {
        key: `feedback-submitted:${bookingId}`,
        type: "FEEDBACK_SUBMITTED",
        bookingId,
        data: { reportId: created.id },
      });

      return created;
    });

    await this.notifications.dispatchSafely();

    return { feedback: toReportResponse(report, null) };
  }

  async submitReview(
    actor: PublicUser,
    bookingId: string,
    input: SubmitReviewInput,
  ) {
    const review = await this.prisma.$transaction(async (tx) => {
      await lockBooking(tx, bookingId);

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: feedbackBookingInclude,
      });

      if (!booking || booking.candidateUserId !== actor.id) {
        throw this.bookingNotFound();
      }

      if (!booking.feedbackReport) {
        throw new AppException(
          "FEEDBACK_REQUIRED",
          "Feedback must be submitted before you can review the expert.",
          HttpStatus.CONFLICT,
        );
      }

      if (booking.review) {
        throw new AppException(
          "REVIEW_ALREADY_SUBMITTED",
          "You have already reviewed this expert for this interview.",
          HttpStatus.CONFLICT,
        );
      }

      if (booking.status !== "COMPLETED") {
        throw new AppException(
          "REVIEW_NOT_AVAILABLE",
          "Reviews open after the feedback report is submitted.",
          HttpStatus.CONFLICT,
          { status: booking.status },
        );
      }

      return tx.review.create({
        data: {
          bookingId,
          candidateUserId: actor.id,
          expertProfileId: booking.expertProfile.id,
          rating: input.rating,
          comment: input.comment?.trim() || null,
        },
      });
    });

    return { review: toReviewResponse(review) };
  }

  async listReports(actor: PublicUser) {
    const reports = await this.prisma.feedbackReport.findMany({
      where: { booking: { candidateUserId: actor.id } },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: {
        ...feedbackReportInclude,
        booking: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            timezone: true,
            expertProfile: {
              select: {
                id: true,
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    const reviews = await this.prisma.review.findMany({
      where: { candidateUserId: actor.id },
      select: {
        bookingId: true,
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });
    const reviewByBooking = new Map(
      reviews.map((review) => [review.bookingId, review]),
    );

    return {
      reports: reports.map((report) => ({
        ...toReportResponse(
          report,
          reviewByBooking.get(report.bookingId) ?? null,
        ),
        booking: {
          id: report.booking.id,
          startsAt: report.booking.startsAt.toISOString(),
          endsAt: report.booking.endsAt.toISOString(),
          timezone: report.booking.timezone,
          expert: {
            id: report.booking.expertProfile.id,
            name: report.booking.expertProfile.user.name,
            avatarUrl: report.booking.expertProfile.user.avatarUrl,
          },
        },
      })),
    };
  }

  private activeTemplate(): Promise<FeedbackTemplateRecord | null> {
    return this.prisma.feedbackTemplate.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });
  }

  private bookingNotFound() {
    return new AppException(
      "BOOKING_NOT_FOUND",
      "The booking does not exist.",
      HttpStatus.NOT_FOUND,
    );
  }

  private templateUnavailable() {
    return new AppException(
      "FEEDBACK_TEMPLATE_UNAVAILABLE",
      "Feedback cannot be submitted because no evaluation template is configured.",
      HttpStatus.CONFLICT,
    );
  }
}

function assertAllCriteriaScored(
  template: FeedbackTemplateRecord,
  input: SubmitFeedbackInput,
): void {
  const scores = new Map(
    input.scores.map((entry) => [entry.criterionId, entry.score]),
  );

  const missing = template.criteria.filter(
    (criterion) => !scores.has(criterion.id),
  );
  const unknown = [...scores.keys()].filter(
    (criterionId) =>
      !template.criteria.some((criterion) => criterion.id === criterionId),
  );

  if (missing.length > 0 || unknown.length > 0) {
    throw new AppException(
      "INVALID_FEEDBACK_SCORES",
      "Score every criterion in the selected feedback template exactly once.",
      HttpStatus.BAD_REQUEST,
      {
        missingCriteria: missing.map((criterion) => criterion.id),
        unknownCriteria: unknown,
      },
    );
  }
}

function isParticipant(booking: FeedbackBooking, userId: string): boolean {
  return (
    booking.candidateUserId === userId ||
    booking.expertProfile.userId === userId
  );
}

function toTemplateResponse(template: FeedbackTemplateRecord) {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    criteria: template.criteria.map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description,
      weight: criterion.weight,
      sortOrder: criterion.sortOrder,
    })),
  };
}

function toReportResponse(
  report: FeedbackReportRecord,
  review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
  } | null,
) {
  const totalWeight = report.scores.reduce(
    (sum, entry) => sum + entry.criterion.weight,
    0,
  );
  const weightedScore = report.scores.reduce(
    (sum, entry) => sum + entry.score * entry.criterion.weight,
    0,
  );

  return {
    id: report.id,
    bookingId: report.bookingId,
    overallSummary: report.overallSummary,
    strengths: report.strengths,
    improvementAreas: report.improvementAreas,
    recommendations: report.recommendations,
    submittedAt: report.submittedAt.toISOString(),
    template: report.template,
    averageScore:
      totalWeight > 0
        ? Math.round((weightedScore / totalWeight) * 10) / 10
        : null,
    criteria: report.scores.map((entry) => ({
      criterionId: entry.criterion.id,
      name: entry.criterion.name,
      description: entry.criterion.description,
      weight: entry.criterion.weight,
      sortOrder: entry.criterion.sortOrder,
      score: entry.score,
      evidenceComment: entry.evidenceComment,
    })),
    review: review ? toReviewResponse(review) : null,
  };
}

function toReviewResponse(review: {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  };
}
