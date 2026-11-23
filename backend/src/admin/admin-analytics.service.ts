import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const [
      candidates,
      approvedExperts,
      pendingApplications,
      bookings,
      completedBookings,
      awaitingFeedback,
      upcomingInterviews,
      bookingStatuses,
      successfulPayments,
      refunds,
      payouts,
      feedbackReports,
      reviewStats,
      recentActivity,
      recentBookings,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { roles: { some: { role: "CANDIDATE" } } },
      }),
      this.prisma.expertProfile.count({
        where: { verificationStatus: "APPROVED" },
      }),
      this.prisma.expertProfile.count({
        where: { verificationStatus: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: "COMPLETED" } }),
      this.prisma.booking.count({
        where: { status: "COMPLETED_PENDING_FEEDBACK" },
      }),
      this.prisma.booking.count({
        where: {
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
          startsAt: { gte: now },
        },
      }),
      this.prisma.booking.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ["currency"],
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.refund.groupBy({
        by: ["currency"],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.payout.groupBy({
        by: ["status", "currency"],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.feedbackReport.count(),
      this.prisma.review.aggregate({
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { id: true, name: true } } },
      }),
      this.prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          startsAt: true,
          createdAt: true,
          candidate: { select: { id: true, name: true } },
          expertProfile: {
            select: { id: true, user: { select: { name: true } } },
          },
        },
      }),
    ]);

    return {
      users: {
        candidates,
        approvedExperts,
        pendingApplications,
      },
      bookings: {
        total: bookings,
        completed: completedBookings,
        awaitingFeedback,
        upcomingInterviews,
        byStatus: bookingStatuses.map((entry) => ({
          status: entry.status,
          count: entry._count._all,
        })),
      },
      payments: {
        successfulCount: successfulPayments.reduce(
          (sum, entry) => sum + entry._count._all,
          0,
        ),
        grossByCurrency: successfulPayments.flatMap((entry) =>
          entry.currency && entry._sum.amount !== null
            ? [
                {
                  currency: entry.currency,
                  amount: entry._sum.amount,
                  count: entry._count._all,
                },
              ]
            : [],
        ),
      },
      refunds: {
        count: refunds.reduce((sum, entry) => sum + entry._count._all, 0),
        byCurrency: refunds.map((entry) => ({
          currency: entry.currency,
          amount: entry._sum.amount ?? 0,
          count: entry._count._all,
        })),
      },
      payouts: payouts.map((entry) => ({
        status: entry.status,
        currency: entry.currency,
        amount: entry._sum.amount ?? 0,
        count: entry._count._all,
      })),
      feedback: {
        reports: feedbackReports,
        reviews: reviewStats._count._all,
        averageRating:
          reviewStats._avg.rating === null
            ? null
            : Math.round(reviewStats._avg.rating * 10) / 10,
      },
      recentActivity: recentActivity.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actor: entry.actor,
        createdAt: entry.createdAt.toISOString(),
      })),
      recentBookings: recentBookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        startsAt: booking.startsAt.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        candidateName: booking.candidate.name,
        expertName: booking.expertProfile.user.name,
      })),
    };
  }
}
