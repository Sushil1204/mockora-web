import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AppException } from "../common/errors/app.exception";
import { readIdempotencyKey } from "../common/idempotency";
import type { PublicUser } from "../auth/auth.types";
import { AvailabilityService } from "../availability/availability.service";
import { enqueueNotificationEvent } from "../notifications/notification-events";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { expireBookingWithinTransaction } from "./booking-expiry";
import { lockBooking } from "./booking-lock";
import type {
  CreateBookingInput,
  DeclineBookingInput,
  ListBookingsQuery,
} from "./bookings.schemas";

export const EXPERT_RESPONSE_TTL_MINUTES = 120;
export const PAYMENT_TTL_MINUTES = 60;

const bookingInclude = {
  candidate: {
    select: { id: true, name: true, avatarUrl: true },
  },
  expertProfile: {
    select: {
      id: true,
      userId: true,
      timezone: true,
      professionalHeadline: true,
      user: { select: { name: true, avatarUrl: true } },
    },
  },
  reservation: {
    select: { id: true, status: true, expiresAt: true },
  },
  history: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
    },
  },
} satisfies Prisma.BookingInclude;

type BookingRecord = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

type BookingOutcome =
  | { kind: "not_found" }
  | { kind: "invalid_status"; status: BookingRecord["status"] }
  | { kind: "reservation_unavailable" }
  | { kind: "expired" }
  | { kind: "ok"; booking: BookingRecord };

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
  ) {}

  async createBooking(
    actor: PublicUser,
    input: CreateBookingInput,
    rawIdempotencyKey?: string,
  ) {
    const idempotencyKey = readIdempotencyKey(rawIdempotencyKey);

    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(
        actor.id,
        idempotencyKey,
        this.prisma,
      );

      if (existing) {
        return { booking: toBookingResponse(existing, actor.id) };
      }
    }

    const now = new Date();
    const expertResponseDeadline = addMinutes(now, EXPERT_RESPONSE_TTL_MINUTES);

    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        if (idempotencyKey) {
          const existing = await this.findByIdempotencyKey(
            actor.id,
            idempotencyKey,
            tx,
          );

          if (existing) {
            return existing;
          }
        }

        const reservation = await this.availability.reserveSlotInTransaction(
          tx,
          {
            expertProfileId: input.expertProfileId,
            candidateUserId: actor.id,
            startsAt: new Date(input.startsAt),
            expiresAt: expertResponseDeadline,
          },
        );

        const expert = await tx.expertProfile.findUniqueOrThrow({
          where: { id: input.expertProfileId },
          select: { timezone: true },
        });

        const durationMinutes = Math.round(
          (reservation.endsAt.getTime() - reservation.startsAt.getTime()) /
            60_000,
        );
        const pricing = await tx.pricingRule.findFirst({
          where: {
            durationMinutes,
            isActive: true,
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
          orderBy: { effectiveFrom: "desc" },
        });

        const booking = await tx.booking.create({
          data: {
            candidateUserId: actor.id,
            expertProfileId: input.expertProfileId,
            startsAt: reservation.startsAt,
            endsAt: reservation.endsAt,
            timezone: expert.timezone ?? "UTC",
            durationMinutes,
            priceAmount: pricing?.candidatePriceAmount ?? null,
            currency: pricing?.currency ?? null,
            expertPayoutAmount: pricing?.expertPayoutAmount ?? null,
            platformAmount: pricing?.platformAmount ?? null,
            idempotencyKey,
            expertResponseDeadline,
          },
        });

        await tx.slotReservation.update({
          where: { id: reservation.id },
          data: { bookingId: booking.id },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            toStatus: "PENDING_EXPERT_APPROVAL",
            changedByUserId: actor.id,
            reason: "Booking requested.",
          },
        });

        await enqueueNotificationEvent(tx, {
          key: `booking-requested:${booking.id}`,
          type: "BOOKING_REQUESTED",
          bookingId: booking.id,
          data: {
            expertResponseDeadline: expertResponseDeadline.toISOString(),
          },
        });

        return tx.booking.findUniqueOrThrow({
          where: { id: booking.id },
          include: bookingInclude,
        });
      });

      await this.notifications.dispatchSafely();

      return { booking: toBookingResponse(booking, actor.id) };
    } catch (error) {
      if (idempotencyKey && isUniqueConstraintError(error)) {
        const existing = await this.findByIdempotencyKey(
          actor.id,
          idempotencyKey,
          this.prisma,
        );

        if (existing) {
          return { booking: toBookingResponse(existing, actor.id) };
        }
      }

      throw error;
    }
  }

  async listBookings(actor: PublicUser, query: ListBookingsQuery) {
    await this.expireOverdueBookings();

    const where: Prisma.BookingWhereInput = {};

    if (query.as === "candidate") {
      where.candidateUserId = actor.id;
    } else if (query.as === "expert") {
      where.expertProfile = { userId: actor.id };
    } else {
      where.OR = [
        { candidateUserId: actor.id },
        { expertProfile: { userId: actor.id } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map((booking) => toBookingResponse(booking, actor.id)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async getBooking(actor: PublicUser, bookingId: string) {
    await this.expireOverdueBookings();

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });

    if (!booking || !isParticipant(booking, actor.id)) {
      throw this.bookingNotFound();
    }

    return { booking: toBookingResponse(booking, actor.id) };
  }

  async approveBooking(actor: PublicUser, bookingId: string) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await lockBooking(tx, bookingId);

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });

      if (!booking || booking.expertProfile.userId !== actor.id) {
        return { kind: "not_found" } as const;
      }

      if (booking.status !== "PENDING_EXPERT_APPROVAL") {
        return { kind: "invalid_status", status: booking.status } as const;
      }

      const now = new Date();

      if (booking.expertResponseDeadline <= now) {
        await expireBookingWithinTransaction(
          tx,
          booking,
          "The expert response deadline passed.",
        );
        return { kind: "expired" } as const;
      }

      if (!booking.reservation || booking.reservation.status !== "HELD") {
        return { kind: "reservation_unavailable" } as const;
      }

      const paymentDeadline = addMinutes(now, PAYMENT_TTL_MINUTES);

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "APPROVED_PENDING_PAYMENT",
          paymentDeadline,
        },
      });

      await tx.slotReservation.update({
        where: { id: booking.reservation.id },
        data: { status: "HELD", expiresAt: paymentDeadline },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: "PENDING_EXPERT_APPROVAL",
          toStatus: "APPROVED_PENDING_PAYMENT",
          changedByUserId: actor.id,
          reason: "Expert approved the request.",
        },
      });

      await enqueueNotificationEvent(tx, {
        key: `booking-approved:${booking.id}`,
        type: "BOOKING_APPROVED",
        bookingId: booking.id,
        data: { paymentDeadline: paymentDeadline.toISOString() },
      });

      return {
        kind: "ok",
        booking: await tx.booking.findUniqueOrThrow({
          where: { id: booking.id },
          include: bookingInclude,
        }),
      } as const;
    });

    await this.notifications.dispatchSafely();

    return this.resolveOutcome(outcome, actor.id);
  }

  async declineBooking(
    actor: PublicUser,
    bookingId: string,
    input: DeclineBookingInput,
  ) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await lockBooking(tx, bookingId);

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });

      if (!booking || booking.expertProfile.userId !== actor.id) {
        return { kind: "not_found" } as const;
      }

      if (booking.status !== "PENDING_EXPERT_APPROVAL") {
        return { kind: "invalid_status", status: booking.status } as const;
      }

      const now = new Date();

      if (booking.expertResponseDeadline <= now) {
        await expireBookingWithinTransaction(
          tx,
          booking,
          "The expert response deadline passed.",
        );
        return { kind: "expired" } as const;
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "DECLINED", cancelledAt: now },
      });

      await tx.slotReservation.updateMany({
        where: { bookingId: booking.id, status: "HELD" },
        data: { status: "RELEASED" },
      });

      const reason = input.reason?.trim() || "Expert declined the request.";

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: "PENDING_EXPERT_APPROVAL",
          toStatus: "DECLINED",
          changedByUserId: actor.id,
          reason,
        },
      });

      await enqueueNotificationEvent(tx, {
        key: `booking-declined:${booking.id}`,
        type: "BOOKING_DECLINED",
        bookingId: booking.id,
        data: { reason },
      });

      return {
        kind: "ok",
        booking: await tx.booking.findUniqueOrThrow({
          where: { id: booking.id },
          include: bookingInclude,
        }),
      } as const;
    });

    await this.notifications.dispatchSafely();

    return this.resolveOutcome(outcome, actor.id);
  }

  /** Lazily closes overdue bookings even when no background worker has run. */
  async expireOverdueBookings(): Promise<number> {
    const now = new Date();
    let expired = 0;

    while (true) {
      const overdue = await this.prisma.booking.findMany({
        where: {
          OR: [
            {
              status: "PENDING_EXPERT_APPROVAL",
              expertResponseDeadline: { lte: now },
            },
            {
              status: "APPROVED_PENDING_PAYMENT",
              paymentDeadline: { lte: now },
            },
          ],
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      if (overdue.length === 0) {
        if (expired > 0) {
          await this.notifications.dispatchSafely();
        }

        return expired;
      }

      for (const item of overdue) {
        const count = await this.prisma.$transaction(async (tx) => {
          await lockBooking(tx, item.id);

          const booking = await tx.booking.findUnique({
            where: { id: item.id },
            include: bookingInclude,
          });

          if (!booking) {
            return 0;
          }

          const reason = overdueReason(booking, now);

          if (!reason) {
            return 0;
          }

          await expireBookingWithinTransaction(tx, booking, reason);
          return 1;
        });

        expired += count;
      }

      if (overdue.length < 100) {
        if (expired > 0) {
          await this.notifications.dispatchSafely();
        }

        return expired;
      }
    }
  }

  private async findByIdempotencyKey(
    candidateUserId: string,
    idempotencyKey: string,
    client: PrismaService | Prisma.TransactionClient,
  ) {
    return client.booking.findUnique({
      where: {
        candidateUserId_idempotencyKey: {
          candidateUserId,
          idempotencyKey,
        },
      },
      include: bookingInclude,
    });
  }

  private resolveOutcome(outcome: BookingOutcome, viewerId: string) {
    if (outcome.kind === "not_found") {
      throw this.bookingNotFound();
    }

    if (outcome.kind === "invalid_status") {
      throw new AppException(
        "BOOKING_NOT_PENDING",
        "This booking is no longer waiting for the expert's response.",
        HttpStatus.CONFLICT,
        { status: outcome.status },
      );
    }

    if (outcome.kind === "reservation_unavailable") {
      throw new AppException(
        "SLOT_RESERVATION_UNAVAILABLE",
        "The slot reservation is no longer active. The booking cannot be approved.",
        HttpStatus.CONFLICT,
      );
    }

    if (outcome.kind === "expired") {
      throw this.bookingExpired();
    }

    return { booking: toBookingResponse(outcome.booking, viewerId) };
  }

  private bookingNotFound() {
    return new AppException(
      "BOOKING_NOT_FOUND",
      "The booking does not exist.",
      HttpStatus.NOT_FOUND,
    );
  }

  private bookingExpired() {
    return new AppException(
      "BOOKING_EXPIRED",
      "Booking expired. The time limit to complete this step has passed. Please book another session.",
      HttpStatus.CONFLICT,
    );
  }
}

function overdueReason(booking: BookingRecord, now: Date): string | null {
  if (
    booking.status === "PENDING_EXPERT_APPROVAL" &&
    booking.expertResponseDeadline <= now
  ) {
    return "The expert response deadline passed.";
  }

  if (
    booking.status === "APPROVED_PENDING_PAYMENT" &&
    booking.paymentDeadline &&
    booking.paymentDeadline <= now
  ) {
    return "The payment deadline passed.";
  }

  return null;
}

function isParticipant(booking: BookingRecord, userId: string): boolean {
  return (
    booking.candidateUserId === userId ||
    booking.expertProfile.userId === userId
  );
}

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function toBookingResponse(booking: BookingRecord, viewerId: string) {
  return {
    id: booking.id,
    status: booking.status,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    timezone: booking.timezone,
    durationMinutes: booking.durationMinutes,
    priceAmount: booking.priceAmount,
    currency: booking.currency,
    expertPayoutAmount: booking.expertPayoutAmount,
    platformAmount: booking.platformAmount,
    expertResponseDeadline: booking.expertResponseDeadline.toISOString(),
    paymentDeadline: booking.paymentDeadline?.toISOString() ?? null,
    confirmedAt: booking.confirmedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    viewer: {
      isCandidate: booking.candidateUserId === viewerId,
      isExpert: booking.expertProfile.userId === viewerId,
    },
    expert: {
      id: booking.expertProfile.id,
      name: booking.expertProfile.user.name,
      avatarUrl: booking.expertProfile.user.avatarUrl,
      professionalHeadline: booking.expertProfile.professionalHeadline,
      timezone: booking.expertProfile.timezone,
    },
    candidate: {
      id: booking.candidate.id,
      name: booking.candidate.name,
      avatarUrl: booking.candidate.avatarUrl,
    },
    reservation: booking.reservation
      ? {
          id: booking.reservation.id,
          status: booking.reservation.status,
          expiresAt: booking.reservation.expiresAt.toISOString(),
        }
      : null,
    history: booking.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
