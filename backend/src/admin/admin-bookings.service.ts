import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { PublicUser } from "../auth/auth.types";
import { lockBooking } from "../bookings/booking-lock";
import { BookingsService } from "../bookings/bookings.service";
import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import type {
  AdminCancelBookingInput,
  ListAdminBookingsQuery,
} from "./admin.schemas";

const adminBookingListInclude = {
  candidate: { select: { id: true, name: true, email: true, avatarUrl: true } },
  expertProfile: {
    select: {
      id: true,
      professionalHeadline: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  payments: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      status: true,
      amount: true,
      currency: true,
      paidAt: true,
      createdAt: true,
    },
  },
  refunds: {
    orderBy: { createdAt: "desc" },
    select: { id: true, amount: true, currency: true, reason: true },
  },
} satisfies Prisma.BookingInclude;

const adminBookingDetailInclude = {
  ...adminBookingListInclude,
  history: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
      changedBy: { select: { id: true, name: true } },
    },
  },
  interviewSession: {
    select: { id: true, status: true, startedAt: true, endedAt: true },
  },
  feedbackReport: {
    select: {
      id: true,
      submittedAt: true,
      overallSummary: true,
      strengths: true,
      improvementAreas: true,
      recommendations: true,
      scores: {
        select: {
          score: true,
          evidenceComment: true,
          criterion: { select: { name: true, sortOrder: true } },
        },
        orderBy: { criterion: { sortOrder: "asc" } },
      },
    },
  },
  review: {
    select: { id: true, rating: true, comment: true, createdAt: true },
  },
  payout: {
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      eligibleAt: true,
      paidAt: true,
    },
  },
} satisfies Prisma.BookingInclude;

type AdminBookingListRecord = Prisma.BookingGetPayload<{
  include: typeof adminBookingListInclude;
}>;
type AdminBookingDetailRecord = Prisma.BookingGetPayload<{
  include: typeof adminBookingDetailInclude;
}>;

const cancellableStatuses = [
  "PENDING_EXPERT_APPROVAL",
  "APPROVED_PENDING_PAYMENT",
  "CONFIRMED",
] as const;

@Injectable()
export class AdminBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bookings: BookingsService,
  ) {}

  async listBookings(query: ListAdminBookingsQuery) {
    await this.expireOverdue();
    const where = this.buildWhere(query);

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: adminBookingListInclude,
      }),
    ]);

    return {
      bookings: bookings.map(toBookingSummary),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async getBooking(bookingId: string) {
    await this.expireOverdue();
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: adminBookingDetailInclude,
    });

    if (!booking) {
      throw this.bookingNotFound();
    }

    return { booking: toBookingDetail(booking) };
  }

  async cancel(
    actor: PublicUser,
    bookingId: string,
    input: AdminCancelBookingInput,
  ) {
    const booking = await this.prisma.$transaction(async (tx) => {
      await lockBooking(tx, bookingId);

      const current = await tx.booking.findUnique({
        where: { id: bookingId },
        include: adminBookingListInclude,
      });

      if (!current) {
        throw this.bookingNotFound();
      }

      if (
        !cancellableStatuses.includes(
          current.status as (typeof cancellableStatuses)[number],
        )
      ) {
        throw new AppException(
          "BOOKING_NOT_CANCELLABLE",
          "This booking is not in a state that can be cancelled.",
          HttpStatus.CONFLICT,
          { status: current.status },
        );
      }

      const successfulPayments = current.payments.filter(
        (payment) => payment.status === "SUCCEEDED",
      );
      const paidPayment = successfulPayments[0];

      if (input.refundAmount > 0) {
        if (!paidPayment || paidPayment.amount === null) {
          throw new AppException(
            "REFUND_WITHOUT_PAYMENT",
            "A refund cannot be recorded because this booking has no successful payment.",
            HttpStatus.CONFLICT,
          );
        }

        const alreadyRefunded = current.refunds.reduce(
          (sum, refund) => sum + refund.amount,
          0,
        );
        const refundable = paidPayment.amount - alreadyRefunded;

        if (input.refundAmount > refundable) {
          throw new AppException(
            "REFUND_EXCEEDS_PAYMENT",
            "The refund cannot be greater than the remaining refundable amount.",
            HttpStatus.CONFLICT,
            { refundable },
          );
        }

        await tx.refund.create({
          data: {
            bookingId,
            paymentId: paidPayment.id,
            amount: input.refundAmount,
            currency: paidPayment.currency ?? current.currency ?? "INR",
            reason: input.reason,
            recordedById: actor.id,
          },
        });

        const totalRefunded = alreadyRefunded + input.refundAmount;
        const fullyRefunded = totalRefunded >= paidPayment.amount;

        await tx.payment.update({
          where: { id: paidPayment.id },
          data: {
            status: fullyRefunded ? "REFUNDED" : "REFUND_PENDING",
          },
        });
      }

      const now = new Date();
      const saved = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED", cancelledAt: now },
        include: adminBookingDetailInclude,
      });

      await tx.slotReservation.updateMany({
        where: { bookingId, status: "HELD" },
        data: { status: "RELEASED" },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: current.status,
          toStatus: "CANCELLED",
          changedByUserId: actor.id,
          reason: input.reason,
        },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: "BOOKING_CANCELLED_BY_ADMIN",
        entityType: "BOOKING",
        entityId: bookingId,
        beforeState: { status: current.status },
        afterState: {
          status: saved.status,
          refundAmount: input.refundAmount,
          reason: input.reason,
        },
      });

      return saved;
    });

    return { booking: toBookingDetail(booking) };
  }

  private buildWhere(query: ListAdminBookingsQuery): Prisma.BookingWhereInput {
    const where: Prisma.BookingWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      where.OR = [
        { candidate: { name: contains } },
        { candidate: { email: contains } },
        { expertProfile: { user: { name: contains } } },
        { expertProfile: { user: { email: contains } } },
      ];
    }

    return where;
  }

  private async expireOverdue() {
    // Reuse the booking service's lazy expiry so admin lists never show a
    // booking as actionable after its deadline has passed.
    await this.bookings.expireOverdueBookings();
  }

  private bookingNotFound() {
    return new AppException(
      "BOOKING_NOT_FOUND",
      "The booking does not exist.",
      HttpStatus.NOT_FOUND,
    );
  }
}

function toBookingSummary(booking: AdminBookingListRecord) {
  const refundedAmount = booking.refunds.reduce(
    (sum, refund) => sum + refund.amount,
    0,
  );
  const payment = booking.payments[0] ?? null;

  return {
    id: booking.id,
    status: booking.status,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    durationMinutes: booking.durationMinutes,
    timezone: booking.timezone,
    priceAmount: booking.priceAmount,
    currency: booking.currency,
    expertPayoutAmount: booking.expertPayoutAmount,
    platformAmount: booking.platformAmount,
    createdAt: booking.createdAt.toISOString(),
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    candidate: booking.candidate,
    expert: {
      id: booking.expertProfile.id,
      name: booking.expertProfile.user.name,
      email: booking.expertProfile.user.email,
      professionalHeadline: booking.expertProfile.professionalHeadline,
    },
    payment: payment
      ? {
          id: payment.id,
          provider: payment.provider,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.paidAt?.toISOString() ?? null,
        }
      : null,
    refundedAmount,
    refundCurrency: booking.refunds[0]?.currency ?? null,
  };
}

function toBookingDetail(booking: AdminBookingDetailRecord) {
  return {
    ...toBookingSummary(booking),
    history: booking.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
      changedBy: entry.changedBy,
    })),
    payments: booking.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    })),
    refunds: booking.refunds.map((refund) => ({
      id: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
    })),
    interviewSession: booking.interviewSession
      ? {
          id: booking.interviewSession.id,
          status: booking.interviewSession.status,
          startedAt: booking.interviewSession.startedAt?.toISOString() ?? null,
          endedAt: booking.interviewSession.endedAt?.toISOString() ?? null,
        }
      : null,
    feedback: booking.feedbackReport
      ? {
          id: booking.feedbackReport.id,
          submittedAt: booking.feedbackReport.submittedAt.toISOString(),
          overallSummary: booking.feedbackReport.overallSummary,
          strengths: booking.feedbackReport.strengths,
          improvementAreas: booking.feedbackReport.improvementAreas,
          recommendations: booking.feedbackReport.recommendations,
          scores: booking.feedbackReport.scores.map((score) => ({
            name: score.criterion.name,
            score: score.score,
            evidenceComment: score.evidenceComment,
          })),
        }
      : null,
    review: booking.review
      ? {
          id: booking.review.id,
          rating: booking.review.rating,
          comment: booking.review.comment,
          createdAt: booking.review.createdAt.toISOString(),
        }
      : null,
    payout: booking.payout
      ? {
          id: booking.payout.id,
          amount: booking.payout.amount,
          currency: booking.payout.currency,
          status: booking.payout.status,
          eligibleAt: booking.payout.eligibleAt?.toISOString() ?? null,
          paidAt: booking.payout.paidAt?.toISOString() ?? null,
        }
      : null,
  };
}

function pagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
