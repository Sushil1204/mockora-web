import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { PublicUser } from "../auth/auth.types";
import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import type {
  ListAdminPaymentsQuery,
  ListAdminPayoutsQuery,
  ListAdminRefundsQuery,
  MarkPayoutPaidInput,
} from "./admin.schemas";

const paymentInclude = {
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
    },
  },
} satisfies Prisma.PaymentInclude;

const refundInclude = {
  payment: {
    select: { id: true, provider: true, status: true, amount: true },
  },
  recordedBy: { select: { id: true, name: true, email: true } },
  booking: {
    select: {
      id: true,
      status: true,
      startsAt: true,
      candidate: { select: { id: true, name: true, email: true } },
      expertProfile: {
        select: { id: true, user: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.RefundInclude;

const payoutInclude = {
  expertProfile: {
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  booking: {
    select: {
      id: true,
      status: true,
      startsAt: true,
      completedAt: true,
      candidate: { select: { id: true, name: true } },
    },
  },
  paidBy: { select: { id: true, name: true } },
} satisfies Prisma.PayoutInclude;

type PaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;
type RefundRecord = Prisma.RefundGetPayload<{ include: typeof refundInclude }>;
type PayoutRecord = Prisma.PayoutGetPayload<{ include: typeof payoutInclude }>;

@Injectable()
export class AdminFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPayments(query: ListAdminPaymentsQuery) {
    const where: Prisma.PaymentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      where.booking = {
        OR: [
          { candidate: { name: contains } },
          { candidate: { email: contains } },
          { expertProfile: { user: { name: contains } } },
          { expertProfile: { user: { email: contains } } },
        ],
      };
    }

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: paymentInclude,
      }),
    ]);

    return {
      payments: payments.map(toPaymentResponse),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async listRefunds(query: ListAdminRefundsQuery) {
    const where: Prisma.RefundWhereInput = {};

    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      where.OR = [
        { reason: contains },
        { booking: { candidate: { name: contains } } },
        { booking: { candidate: { email: contains } } },
        { booking: { expertProfile: { user: { name: contains } } } },
      ];
    }

    const [total, refunds] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: refundInclude,
      }),
    ]);

    return {
      refunds: refunds.map(toRefundResponse),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async listPayouts(query: ListAdminPayoutsQuery) {
    const where: Prisma.PayoutWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      where.OR = [
        { expertProfile: { user: { name: contains } } },
        { expertProfile: { user: { email: contains } } },
        { booking: { candidate: { name: contains } } },
      ];
    }

    const [total, payouts] = await Promise.all([
      this.prisma.payout.count({ where }),
      this.prisma.payout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: payoutInclude,
      }),
    ]);

    return {
      payouts: payouts.map(toPayoutResponse),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async markPayoutPaid(
    actor: PublicUser,
    payoutId: string,
    input: MarkPayoutPaidInput,
  ) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: payoutInclude,
    });

    if (!payout) {
      throw new AppException(
        "PAYOUT_NOT_FOUND",
        "The requested payout entry does not exist.",
        HttpStatus.NOT_FOUND,
      );
    }

    if (payout.status !== "ELIGIBLE") {
      throw new AppException(
        "PAYOUT_NOT_ELIGIBLE",
        "Only eligible payout entries can be marked as paid.",
        HttpStatus.CONFLICT,
        { status: payout.status },
      );
    }

    const paid = await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();
      const result = await tx.payout.updateMany({
        where: { id: payout.id, status: "ELIGIBLE" },
        data: { status: "PAID", paidAt, paidById: actor.id },
      });

      if (result.count === 0) {
        throw new AppException(
          "PAYOUT_ALREADY_UPDATED",
          "This payout entry changed while it was being updated. Refresh and try again.",
          HttpStatus.CONFLICT,
        );
      }

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: "PAYOUT_MARKED_PAID",
        entityType: "PAYOUT",
        entityId: payout.id,
        beforeState: { status: payout.status, paidAt: payout.paidAt },
        afterState: {
          status: "PAID",
          paidAt: paidAt.toISOString(),
          note: input.reason ?? null,
        },
      });

      return tx.payout.findUniqueOrThrow({
        where: { id: payout.id },
        include: payoutInclude,
      });
    });

    return { payout: toPayoutResponse(paid) };
  }
}

function toPaymentResponse(payment: PaymentRecord) {
  return {
    id: payment.id,
    provider: payment.provider,
    providerPaymentReference: payment.providerPaymentReference,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    paidAt: payment.paidAt?.toISOString() ?? null,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt.toISOString(),
    booking: {
      id: payment.booking.id,
      status: payment.booking.status,
      startsAt: payment.booking.startsAt.toISOString(),
      durationMinutes: payment.booking.durationMinutes,
      candidate: payment.booking.candidate,
      expert: {
        id: payment.booking.expertProfile.id,
        name: payment.booking.expertProfile.user.name,
      },
    },
  };
}

function toRefundResponse(refund: RefundRecord) {
  return {
    id: refund.id,
    amount: refund.amount,
    currency: refund.currency,
    reason: refund.reason,
    createdAt: refund.createdAt.toISOString(),
    payment: refund.payment
      ? {
          id: refund.payment.id,
          provider: refund.payment.provider,
          status: refund.payment.status,
          amount: refund.payment.amount,
        }
      : null,
    recordedBy: refund.recordedBy,
    booking: {
      id: refund.booking.id,
      status: refund.booking.status,
      startsAt: refund.booking.startsAt.toISOString(),
      candidate: refund.booking.candidate,
      expert: {
        id: refund.booking.expertProfile.id,
        name: refund.booking.expertProfile.user.name,
      },
    },
  };
}

function toPayoutResponse(payout: PayoutRecord) {
  return {
    id: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    status: payout.status,
    eligibleAt: payout.eligibleAt?.toISOString() ?? null,
    paidAt: payout.paidAt?.toISOString() ?? null,
    createdAt: payout.createdAt.toISOString(),
    expert: {
      id: payout.expertProfile.id,
      name: payout.expertProfile.user.name,
      email: payout.expertProfile.user.email,
    },
    paidBy: payout.paidBy,
    booking: {
      id: payout.booking.id,
      status: payout.booking.status,
      startsAt: payout.booking.startsAt.toISOString(),
      completedAt: payout.booking.completedAt?.toISOString() ?? null,
      candidateName: payout.booking.candidate.name,
    },
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
