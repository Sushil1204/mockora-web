import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { PublicUser } from "../auth/auth.types";
import { expireBookingWithinTransaction } from "../bookings/booking-expiry";
import { lockBooking } from "../bookings/booking-lock";
import { BookingsService } from "../bookings/bookings.service";
import { AppException } from "../common/errors/app.exception";
import { readIdempotencyKey } from "../common/idempotency";
import { PrismaService } from "../prisma/prisma.service";
import {
  MockPaymentProvider,
  type MockPaymentOutcome,
} from "./providers/mock-payment.provider";
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from "./providers/payment-provider.interface";
import type { MockPaymentResultInput } from "./payments.schemas";

const paymentInclude = {
  booking: {
    select: {
      id: true,
      candidateUserId: true,
      status: true,
      paymentDeadline: true,
      reservation: { select: { id: true, status: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

type PaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;

type PaymentOutcome =
  | { kind: "booking_not_found" }
  | { kind: "payment_not_found" }
  | { kind: "not_pending" }
  | { kind: "not_payable"; message: string }
  | { kind: "expired" }
  | { kind: "reservation_unavailable" }
  | { kind: "ok"; payment: PaymentRecord };

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly mockProvider: MockPaymentProvider,
  ) {}

  async createAttempt(
    actor: PublicUser,
    bookingId: string,
    rawIdempotencyKey?: string,
  ) {
    const idempotencyKey = readIdempotencyKey(rawIdempotencyKey);

    const outcome = await this.prisma.$transaction(async (tx) => {
      await lockBooking(tx, bookingId);

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { reservation: { select: { id: true, status: true } } },
      });

      if (!booking || booking.candidateUserId !== actor.id) {
        return { kind: "booking_not_found" } as const;
      }

      if (idempotencyKey) {
        const existing = await tx.payment.findUnique({
          where: {
            bookingId_idempotencyKey: { bookingId, idempotencyKey },
          },
          include: paymentInclude,
        });

        if (existing) {
          return { kind: "ok", payment: existing } as const;
        }
      }

      if (booking.status === "CONFIRMED") {
        return {
          kind: "not_payable",
          message: "This booking is already confirmed.",
        } as const;
      }

      if (booking.status === "EXPIRED") {
        return { kind: "expired" } as const;
      }

      if (booking.status !== "APPROVED_PENDING_PAYMENT") {
        return {
          kind: "not_payable",
          message: "The expert has not approved this booking request yet.",
        } as const;
      }

      const now = new Date();

      if (!booking.paymentDeadline || booking.paymentDeadline <= now) {
        await expireBookingWithinTransaction(
          tx,
          booking,
          "The payment deadline passed.",
        );
        return { kind: "expired" } as const;
      }

      if (!booking.reservation || booking.reservation.status !== "HELD") {
        return { kind: "reservation_unavailable" } as const;
      }

      const openAttempt = await tx.payment.findFirst({
        where: {
          bookingId,
          status: { in: ["CREATED", "PENDING"] },
        },
        orderBy: { createdAt: "desc" },
        include: paymentInclude,
      });

      if (openAttempt) {
        return { kind: "ok", payment: openAttempt } as const;
      }

      const providerPayment = await this.provider.createPayment({
        bookingId,
        amount: booking.priceAmount,
        currency: booking.currency,
      });

      const payment = await tx.payment.create({
        data: {
          bookingId,
          provider: this.provider.name,
          providerPaymentReference: providerPayment.providerReference,
          amount: booking.priceAmount,
          currency: booking.currency,
          status: providerPayment.status,
          idempotencyKey,
        },
        include: paymentInclude,
      });

      return { kind: "ok", payment } as const;
    });

    return this.resolveOutcome(outcome);
  }

  async getPayment(actor: PublicUser, paymentId: string) {
    await this.bookings.expireOverdueBookings();

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentInclude,
    });

    if (!payment || payment.booking.candidateUserId !== actor.id) {
      throw this.paymentNotFound();
    }

    return { payment: toPaymentResponse(payment) };
  }

  async applyMockResult(
    actor: PublicUser,
    paymentId: string,
    input: MockPaymentResultInput,
  ) {
    const initial = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { bookingId: true },
    });

    if (!initial) {
      throw this.paymentNotFound();
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      await lockBooking(tx, initial.bookingId);

      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: paymentInclude,
      });

      if (!payment || payment.booking.candidateUserId !== actor.id) {
        return { kind: "payment_not_found" } as const;
      }

      if (payment.status === "SUCCEEDED") {
        return input.outcome === "SUCCESS"
          ? ({ kind: "ok", payment } as const)
          : ({ kind: "not_pending" } as const);
      }

      const booking = payment.booking;

      if (payment.status !== "PENDING") {
        return payment.status === "CANCELLED" && booking.status === "EXPIRED"
          ? ({ kind: "expired" } as const)
          : ({ kind: "not_pending" } as const);
      }

      if (booking.status === "EXPIRED") {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "CANCELLED",
            failureReason: "Booking expired before payment completed.",
          },
        });
        return { kind: "expired" } as const;
      }

      if (booking.status !== "APPROVED_PENDING_PAYMENT") {
        return {
          kind: "not_payable",
          message: "This booking is not awaiting payment.",
        } as const;
      }

      const now = new Date();

      if (!booking.paymentDeadline || booking.paymentDeadline <= now) {
        await expireBookingWithinTransaction(
          tx,
          booking,
          "The payment deadline passed.",
        );
        return { kind: "expired" } as const;
      }

      if (!booking.reservation || booking.reservation.status !== "HELD") {
        return { kind: "reservation_unavailable" } as const;
      }

      const providerResult = this.mockProvider.simulateResult(
        payment.providerPaymentReference ?? "",
        input.outcome as MockPaymentOutcome,
      );

      if (providerResult.status === "FAILED") {
        const failed = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            paidAt: null,
            failureReason:
              input.failureReason?.trim() || "The mock payment was declined.",
          },
          include: paymentInclude,
        });

        return { kind: "ok", payment: failed } as const;
      }

      const paidAt = new Date();

      const succeeded = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          paidAt,
          failureReason: null,
        },
        include: paymentInclude,
      });

      await tx.payment.updateMany({
        where: {
          bookingId: booking.id,
          id: { not: payment.id },
          status: { in: ["CREATED", "PENDING"] },
        },
        data: {
          status: "CANCELLED",
          failureReason: "Another payment attempt succeeded.",
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", confirmedAt: paidAt },
      });

      await tx.slotReservation.updateMany({
        where: { bookingId: booking.id, status: "HELD" },
        data: { status: "CONSUMED" },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: "APPROVED_PENDING_PAYMENT",
          toStatus: "CONFIRMED",
          changedByUserId: actor.id,
          reason: "Mock payment succeeded; booking confirmed.",
        },
      });

      return { kind: "ok", payment: succeeded } as const;
    });

    return this.resolveOutcome(outcome);
  }

  private resolveOutcome(outcome: PaymentOutcome) {
    if (outcome.kind === "booking_not_found") {
      throw new AppException(
        "BOOKING_NOT_FOUND",
        "The booking does not exist.",
        HttpStatus.NOT_FOUND,
      );
    }

    if (outcome.kind === "payment_not_found") {
      throw this.paymentNotFound();
    }

    if (outcome.kind === "not_pending") {
      throw new AppException(
        "PAYMENT_NOT_PENDING",
        "This payment attempt is no longer pending.",
        HttpStatus.CONFLICT,
      );
    }

    if (outcome.kind === "not_payable") {
      throw new AppException(
        "BOOKING_NOT_PAYABLE",
        outcome.message,
        HttpStatus.CONFLICT,
      );
    }

    if (outcome.kind === "expired") {
      throw new AppException(
        "BOOKING_EXPIRED",
        "Booking expired. The time limit to complete this step has passed. Please book another session.",
        HttpStatus.CONFLICT,
      );
    }

    if (outcome.kind === "reservation_unavailable") {
      throw new AppException(
        "SLOT_RESERVATION_UNAVAILABLE",
        "The slot reservation is no longer active. Payment cannot be started.",
        HttpStatus.CONFLICT,
      );
    }

    return { payment: toPaymentResponse(outcome.payment) };
  }

  private paymentNotFound() {
    return new AppException(
      "PAYMENT_NOT_FOUND",
      "The payment does not exist.",
      HttpStatus.NOT_FOUND,
    );
  }
}

function toPaymentResponse(payment: PaymentRecord) {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    provider: payment.provider,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    providerReference: payment.providerPaymentReference,
    paidAt: payment.paidAt?.toISOString() ?? null,
    failureReason: payment.failureReason,
    isSimulated: payment.provider === "MOCK",
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}
