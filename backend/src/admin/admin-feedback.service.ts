import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import type { ListAdminFeedbackQuery } from "./admin.schemas";

const adminFeedbackInclude = {
  template: { select: { id: true, name: true, version: true } },
  expert: { select: { id: true, name: true, email: true } },
  scores: {
    include: {
      criterion: {
        select: { id: true, name: true, weight: true, sortOrder: true },
      },
    },
    orderBy: { criterion: { sortOrder: "asc" as const } },
  },
  booking: {
    select: {
      id: true,
      status: true,
      startsAt: true,
      durationMinutes: true,
      candidate: { select: { id: true, name: true, email: true } },
      expertProfile: {
        select: { id: true, user: { select: { id: true, name: true } } },
      },
      review: {
        select: { id: true, rating: true, comment: true, createdAt: true },
      },
    },
  },
} satisfies Prisma.FeedbackReportInclude;

type FeedbackRecord = Prisma.FeedbackReportGetPayload<{
  include: typeof adminFeedbackInclude;
}>;

@Injectable()
export class AdminFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async listReports(query: ListAdminFeedbackQuery) {
    const where: Prisma.FeedbackReportWhereInput = {};

    if (query.expertId) {
      where.expertUserId = query.expertId;
    }

    if (query.candidateId) {
      where.booking = { candidateUserId: query.candidateId };
    }

    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      where.OR = [
        { overallSummary: contains },
        { strengths: contains },
        { improvementAreas: contains },
        { recommendations: contains },
        { booking: { candidate: { name: contains } } },
        { expert: { name: contains } },
        { expert: { email: contains } },
      ];
    }

    const [total, reports] = await Promise.all([
      this.prisma.feedbackReport.count({ where }),
      this.prisma.feedbackReport.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: adminFeedbackInclude,
      }),
    ]);

    return {
      reports: reports.map(toFeedbackResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async getReport(reportId: string) {
    const report = await this.prisma.feedbackReport.findUnique({
      where: { id: reportId },
      include: adminFeedbackInclude,
    });

    if (!report) {
      throw new AppException(
        "FEEDBACK_NOT_FOUND",
        "The requested feedback report does not exist.",
        HttpStatus.NOT_FOUND,
      );
    }

    return { report: toFeedbackResponse(report) };
  }
}

function toFeedbackResponse(report: FeedbackRecord) {
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
    scores: report.scores.map((entry) => ({
      criterionId: entry.criterion.id,
      name: entry.criterion.name,
      weight: entry.criterion.weight,
      sortOrder: entry.criterion.sortOrder,
      score: entry.score,
      evidenceComment: entry.evidenceComment,
    })),
    expert: report.expert,
    candidate: report.booking.candidate,
    booking: {
      id: report.booking.id,
      status: report.booking.status,
      startsAt: report.booking.startsAt.toISOString(),
      durationMinutes: report.booking.durationMinutes,
      expertProfileId: report.booking.expertProfile.id,
    },
    review: report.booking.review
      ? {
          id: report.booking.review.id,
          rating: report.booking.review.rating,
          comment: report.booking.review.comment,
          createdAt: report.booking.review.createdAt.toISOString(),
        }
      : null,
  };
}
