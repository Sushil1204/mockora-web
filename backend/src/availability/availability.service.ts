import { HttpStatus, Injectable } from "@nestjs/common";

import { AppException } from "../common/errors/app.exception";
import { publiclyAvailableExpertWhere } from "../marketplace/expert-eligibility";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AvailabilityRuleInput,
  CreateAvailabilityExceptionInput,
  PublicAvailabilityQuery,
} from "./availability.schemas";
import {
  calculateAvailableSlots,
  MAX_AVAILABILITY_RANGE_DAYS,
  MINIMUM_NOTICE_MINUTES,
} from "./slot-calculator";
import {
  addDays,
  dateDifference,
  formatIsoDate,
  zonedDateTimeToUtc,
} from "./timezone";

export const RESERVATION_TTL_MINUTES = 120;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnAvailability(userId: string) {
    const profile = await this.requireExpertProfile(userId);
    const now = new Date();

    const [rules, exceptions] = await Promise.all([
      this.prisma.expertAvailabilityRule.findMany({
        where: { expertProfileId: profile.id },
        orderBy: [{ weekday: "asc" }, { startLocalTime: "asc" }],
      }),
      this.prisma.expertAvailabilityException.findMany({
        where: { expertProfileId: profile.id, endsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 50,
      }),
    ]);

    return {
      timezone: profile.timezone ?? rules[0]?.timezone ?? "UTC",
      rules: rules.map(toRuleResponse),
      exceptions: exceptions.map(toExceptionResponse),
    };
  }

  async replaceRules(userId: string, rules: AvailabilityRuleInput[]) {
    const profile = await this.requireExpertProfile(userId);

    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.expertAvailabilityRule.deleteMany({
        where: { expertProfileId: profile.id },
      });

      if (rules.length > 0) {
        await tx.expertAvailabilityRule.createMany({
          data: rules.map((rule) => ({
            expertProfileId: profile.id,
            weekday: rule.weekday,
            startLocalTime: rule.startLocalTime,
            endLocalTime: rule.endLocalTime,
            timezone: rule.timezone,
            slotDurationMinutes: rule.slotDurationMinutes,
            effectiveFrom: new Date(`${rule.effectiveFrom}T00:00:00.000Z`),
            effectiveUntil: rule.effectiveUntil
              ? new Date(`${rule.effectiveUntil}T00:00:00.000Z`)
              : null,
            isActive: rule.isActive,
          })),
        });
      }

      return tx.expertAvailabilityRule.findMany({
        where: { expertProfileId: profile.id },
        orderBy: [{ weekday: "asc" }, { startLocalTime: "asc" }],
      });
    });

    return {
      timezone: profile.timezone ?? saved[0]?.timezone ?? "UTC",
      rules: saved.map(toRuleResponse),
    };
  }

  async createException(
    userId: string,
    input: CreateAvailabilityExceptionInput,
  ) {
    const profile = await this.requireExpertProfile(userId);
    const timezone =
      profile.timezone ??
      (
        await this.prisma.expertAvailabilityRule.findFirst({
          where: { expertProfileId: profile.id, isActive: true },
          orderBy: { createdAt: "desc" },
          select: { timezone: true },
        })
      )?.timezone;

    if (!timezone) {
      throw new AppException(
        "EXPERT_TIMEZONE_REQUIRED",
        "Add a timezone to your expert profile before blocking dates.",
        HttpStatus.CONFLICT,
      );
    }

    if (dateDifference(input.startDate, input.endDate) > 90) {
      throw new AppException(
        "INVALID_AVAILABILITY_EXCEPTION",
        "Availability exceptions can cover at most 90 days.",
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const startsAt = zonedDateTimeToUtc(input.startDate, "00:00", timezone);
    const endsAt = zonedDateTimeToUtc(
      addDays(input.endDate, 1),
      "00:00",
      timezone,
    );

    if (!startsAt || !endsAt || endsAt <= startsAt) {
      throw new AppException(
        "INVALID_AVAILABILITY_EXCEPTION",
        "The selected dates do not exist in your timezone.",
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const exception = await this.prisma.expertAvailabilityException.create({
      data: {
        expertProfileId: profile.id,
        startsAt,
        endsAt,
        exceptionType: "UNAVAILABLE",
        reason: input.reason?.trim() || null,
      },
    });

    return { exception: toExceptionResponse(exception) };
  }

  async deleteException(userId: string, exceptionId: string) {
    const profile = await this.requireExpertProfile(userId);
    const exception = await this.prisma.expertAvailabilityException.findFirst({
      where: { id: exceptionId, expertProfileId: profile.id },
      select: { id: true },
    });

    if (!exception) {
      throw new AppException(
        "AVAILABILITY_EXCEPTION_NOT_FOUND",
        "The availability exception does not exist.",
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.expertAvailabilityException.delete({
      where: { id: exception.id },
    });
  }

  async getPublicAvailability(
    expertProfileId: string,
    query: PublicAvailabilityQuery,
  ) {
    const expert = await this.prisma.expertProfile.findFirst({
      where: {
        AND: [publiclyAvailableExpertWhere, { id: expertProfileId }],
      },
      select: { id: true, timezone: true },
    });

    if (!expert) {
      throw this.expertNotFound();
    }

    const now = new Date();
    const today = formatIsoDate(now);
    const from = query.from && query.from > today ? query.from : today;
    const to = query.to ?? addDays(from, MAX_AVAILABILITY_RANGE_DAYS - 1);

    if (
      dateDifference(from, to) < 0 ||
      dateDifference(from, to) > MAX_AVAILABILITY_RANGE_DAYS - 1
    ) {
      throw new AppException(
        "INVALID_AVAILABILITY_RANGE",
        `Choose a date range of ${MAX_AVAILABILITY_RANGE_DAYS} days or fewer.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.prisma.slotReservation.updateMany({
      where: {
        expertProfileId: expert.id,
        status: "HELD",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    });

    const rangeStart = new Date(`${addDays(from, -1)}T00:00:00.000Z`);
    const rangeEnd = new Date(`${addDays(to, 2)}T00:00:00.000Z`);

    const [rules, exceptions, reservations] = await Promise.all([
      this.prisma.expertAvailabilityRule.findMany({
        where: { expertProfileId: expert.id, isActive: true },
        orderBy: [{ weekday: "asc" }, { startLocalTime: "asc" }],
      }),
      this.prisma.expertAvailabilityException.findMany({
        where: {
          expertProfileId: expert.id,
          startsAt: { lt: rangeEnd },
          endsAt: { gt: rangeStart },
        },
        select: { startsAt: true, endsAt: true },
      }),
      this.prisma.slotReservation.findMany({
        where: {
          expertProfileId: expert.id,
          startsAt: { lt: rangeEnd },
          endsAt: { gt: rangeStart },
          OR: [
            { status: "CONSUMED" },
            { status: "HELD", expiresAt: { gt: now } },
          ],
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    const { slots, truncated } = calculateAvailableSlots({
      rules,
      exceptions,
      reservations,
      from,
      to,
      now,
    });

    return {
      expertProfileId: expert.id,
      timezone: expert.timezone ?? "UTC",
      minimumNoticeMinutes: MINIMUM_NOTICE_MINUTES,
      from,
      to,
      truncated,
      slots: slots.map((slot) => ({
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
      })),
    };
  }

  /**
   * Internal entry point for the booking sprint. The booking request will call
   * this inside its own transaction and then attach the reservation id.
   *
   * The advisory lock serializes claims for one expert; the overlap check and
   * insert then run in the same transaction, so two concurrent requests cannot
   * both hold the same slot. Expired holds are released before validation.
   */
  async reserveSlot(input: {
    expertProfileId: string;
    candidateUserId: string;
    startsAt: Date;
    expiresAt?: Date;
  }) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.expertProfileId}::text))`;

      await tx.slotReservation.updateMany({
        where: {
          expertProfileId: input.expertProfileId,
          status: "HELD",
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      });

      const expert = await tx.expertProfile.findFirst({
        where: {
          AND: [publiclyAvailableExpertWhere, { id: input.expertProfileId }],
        },
        select: { id: true },
      });

      if (!expert) {
        throw this.expertNotFound();
      }

      const candidate = await tx.user.findFirst({
        where: { id: input.candidateUserId, accountStatus: "ACTIVE" },
        select: { id: true },
      });

      if (!candidate) {
        throw new AppException(
          "CANDIDATE_NOT_FOUND",
          "The candidate account does not exist or is not active.",
          HttpStatus.NOT_FOUND,
        );
      }

      const date = formatIsoDate(input.startsAt);
      const rangeStart = new Date(`${addDays(date, -1)}T00:00:00.000Z`);
      const rangeEnd = new Date(`${addDays(date, 2)}T00:00:00.000Z`);

      const [rules, exceptions, reservations] = await Promise.all([
        tx.expertAvailabilityRule.findMany({
          where: { expertProfileId: expert.id, isActive: true },
        }),
        tx.expertAvailabilityException.findMany({
          where: {
            expertProfileId: expert.id,
            startsAt: { lt: rangeEnd },
            endsAt: { gt: rangeStart },
          },
          select: { startsAt: true, endsAt: true },
        }),
        tx.slotReservation.findMany({
          where: {
            expertProfileId: expert.id,
            startsAt: { lt: rangeEnd },
            endsAt: { gt: rangeStart },
            OR: [
              { status: "CONSUMED" },
              { status: "HELD", expiresAt: { gt: now } },
            ],
          },
          select: { startsAt: true, endsAt: true },
        }),
      ]);

      const { slots } = calculateAvailableSlots({
        rules,
        exceptions,
        reservations,
        from: addDays(date, -1),
        to: addDays(date, 1),
        now,
      });
      const slot = slots.find(
        (candidateSlot) =>
          candidateSlot.startsAt.getTime() === input.startsAt.getTime(),
      );

      if (!slot) {
        throw this.slotUnavailable();
      }

      return tx.slotReservation.create({
        data: {
          expertProfileId: expert.id,
          candidateUserId: candidate.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status: "HELD",
          expiresAt:
            input.expiresAt ??
            new Date(now.getTime() + RESERVATION_TTL_MINUTES * 60_000),
        },
      });
    });
  }

  async expireReservations(expertProfileId?: string): Promise<number> {
    const result = await this.prisma.slotReservation.updateMany({
      where: {
        ...(expertProfileId && { expertProfileId }),
        status: "HELD",
        expiresAt: { lte: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    return result.count;
  }

  private async requireExpertProfile(userId: string) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId },
      select: { id: true, timezone: true },
    });

    if (!profile) {
      throw new AppException(
        "EXPERT_PROFILE_NOT_FOUND",
        "Set up your expert profile before managing availability.",
        HttpStatus.NOT_FOUND,
      );
    }

    return profile;
  }

  private expertNotFound(): AppException {
    return new AppException(
      "EXPERT_NOT_FOUND",
      "The requested expert profile does not exist or is not available.",
      HttpStatus.NOT_FOUND,
    );
  }

  private slotUnavailable(): AppException {
    return new AppException(
      "SLOT_UNAVAILABLE",
      "That time is no longer available. Choose another slot.",
      HttpStatus.CONFLICT,
    );
  }
}

function toRuleResponse(rule: {
  id: string;
  weekday: number;
  startLocalTime: string;
  endLocalTime: string;
  timezone: string;
  slotDurationMinutes: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rule.id,
    weekday: rule.weekday,
    startLocalTime: rule.startLocalTime,
    endLocalTime: rule.endLocalTime,
    timezone: rule.timezone,
    slotDurationMinutes: rule.slotDurationMinutes,
    effectiveFrom: rule.effectiveFrom.toISOString().slice(0, 10),
    effectiveUntil: rule.effectiveUntil?.toISOString().slice(0, 10) ?? null,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function toExceptionResponse(exception: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  exceptionType: string;
  reason: string | null;
  createdAt: Date;
}) {
  return {
    id: exception.id,
    startsAt: exception.startsAt.toISOString(),
    endsAt: exception.endsAt.toISOString(),
    exceptionType: exception.exceptionType,
    reason: exception.reason,
    createdAt: exception.createdAt.toISOString(),
  };
}
