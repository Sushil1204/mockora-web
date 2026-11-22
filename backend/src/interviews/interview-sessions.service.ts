import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { InterviewSessionStatus, Prisma } from "@prisma/client";

import type { PublicUser } from "../auth/auth.types";
import { lockBooking } from "../bookings/booking-lock";
import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { createZoomVideoToken } from "./zoom-video-token";

const interviewInclude = {
  candidate: { select: { id: true, name: true } },
  expertProfile: {
    select: { userId: true, user: { select: { name: true } } },
  },
  interviewSession: true,
} satisfies Prisma.BookingInclude;

type InterviewBooking = Prisma.BookingGetPayload<{
  include: typeof interviewInclude;
}>;

type JoinWindow = {
  opensAt: Date;
  closesAt: Date;
};

type UnavailableReason =
  "NOT_CONFIGURED" | "NOT_CONFIRMED" | "NOT_OPEN" | "WINDOW_CLOSED" | "ENDED";

type TokenOutcome =
  | { kind: "not_found" }
  | {
      kind: "unavailable";
      reason: UnavailableReason;
      window: JoinWindow;
    }
  | { kind: "ok"; booking: InterviewBooking };

@Injectable()
export class InterviewSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getSession(actor: PublicUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: interviewInclude,
    });

    if (!booking || !isParticipant(booking, actor.id)) {
      throw this.bookingNotFound();
    }

    return { interview: this.toState(booking, new Date()) };
  }

  async issueToken(actor: PublicUser, bookingId: string) {
    const initial = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: interviewInclude,
    });

    if (!initial || !isParticipant(initial, actor.id)) {
      throw this.bookingNotFound();
    }

    const now = new Date();

    this.assertJoinable(initial, now);

    const outcome = await this.prisma.$transaction(
      async (tx): Promise<TokenOutcome> => {
        await lockBooking(tx, bookingId);

        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: interviewInclude,
        });

        if (!booking || !isParticipant(booking, actor.id)) {
          return { kind: "not_found" };
        }

        const transactionNow = new Date();
        const window = this.getJoinWindow(booking);
        const reason = this.getUnavailableReason(
          booking,
          transactionNow,
          window,
        );

        if (reason) {
          if (reason === "WINDOW_CLOSED" && booking.interviewSession) {
            await closeSessionWithinTransaction(
              tx,
              booking,
              booking.interviewSession,
              booking.endsAt,
            );
          }

          return { kind: "unavailable", reason, window };
        }

        const startedAt = booking.interviewSession?.startedAt ?? transactionNow;

        await tx.interviewSession.upsert({
          where: { bookingId },
          create: {
            bookingId,
            providerSessionReference: interviewSessionName(booking.id),
            status: "IN_PROGRESS",
            startedAt,
          },
          update: {
            status: "IN_PROGRESS",
            startedAt,
          },
        });

        if (booking.status === "CONFIRMED") {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "IN_PROGRESS" },
          });

          await tx.bookingStatusHistory.create({
            data: {
              bookingId: booking.id,
              fromStatus: "CONFIRMED",
              toStatus: "IN_PROGRESS",
              changedByUserId: actor.id,
              reason: "Interview joined by a participant.",
            },
          });
        }

        return {
          kind: "ok",
          booking: await tx.booking.findUniqueOrThrow({
            where: { id: booking.id },
            include: interviewInclude,
          }),
        };
      },
    );

    if (outcome.kind === "not_found") {
      throw this.bookingNotFound();
    }

    if (outcome.kind === "unavailable") {
      throw this.unavailable(outcome.reason, outcome.window);
    }

    const credentials = this.credentials();
    const interview = this.toState(outcome.booking, now);

    return {
      interview: {
        ...interview,
        token: createZoomVideoToken({
          sdkKey: credentials.key,
          sdkSecret: credentials.secret,
          sessionName: interview.sessionName,
          userId: actor.id,
          now,
        }),
        userName: actor.name,
        userIdentity: actor.id,
      },
    };
  }

  /**
   * Ends sessions whose scheduled interview plus grace period has elapsed.
   * The booking moves to feedback pending so the next sprint can close it after
   * feedback is submitted.
   */
  async closeElapsedSessions(now = new Date()): Promise<number> {
    const graceMinutes = this.config.get<number>(
      "INTERVIEW_JOIN_CLOSE_GRACE_MINUTES",
      15,
    );
    const cutoff = new Date(now.getTime() - graceMinutes * 60_000);
    let closed = 0;

    while (true) {
      const due = await this.prisma.interviewSession.findMany({
        where: {
          status: "IN_PROGRESS",
          booking: { endsAt: { lte: cutoff } },
        },
        select: { bookingId: true },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      if (due.length === 0) {
        return closed;
      }

      for (const item of due) {
        const changed = await this.prisma.$transaction(async (tx) => {
          await lockBooking(tx, item.bookingId);

          const booking = await tx.booking.findUnique({
            where: { id: item.bookingId },
            include: interviewInclude,
          });

          if (
            !booking?.interviewSession ||
            booking.interviewSession.status !== "IN_PROGRESS" ||
            booking.endsAt > cutoff
          ) {
            return false;
          }

          await closeSessionWithinTransaction(
            tx,
            booking,
            booking.interviewSession,
            booking.endsAt,
          );
          return true;
        });

        if (changed) {
          closed += 1;
        }
      }

      if (due.length < 100) {
        return closed;
      }
    }
  }

  private toState(booking: InterviewBooking, now: Date) {
    const window = this.getJoinWindow(booking);
    const configured = this.isConfigured();
    const reason = this.getUnavailableReason(booking, now, window);

    return {
      provider: "ZOOM_VIDEO_SDK" as const,
      sessionName:
        booking.interviewSession?.providerSessionReference ??
        interviewSessionName(booking.id),
      status: (booking.interviewSession?.status ?? "NOT_STARTED") as
        InterviewSessionStatus | "NOT_STARTED",
      startedAt: booking.interviewSession?.startedAt?.toISOString() ?? null,
      endedAt: booking.interviewSession?.endedAt?.toISOString() ?? null,
      configured,
      canJoin: reason === null,
      unavailableReason: reason,
      joinWindow: {
        opensAt: window.opensAt.toISOString(),
        closesAt: window.closesAt.toISOString(),
      },
      booking: {
        id: booking.id,
        status: booking.status,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        timezone: booking.timezone,
      },
    };
  }

  private getJoinWindow(booking: { startsAt: Date; endsAt: Date }): JoinWindow {
    const earlyMinutes = this.config.get<number>(
      "INTERVIEW_JOIN_EARLY_MINUTES",
      15,
    );
    const graceMinutes = this.config.get<number>(
      "INTERVIEW_JOIN_CLOSE_GRACE_MINUTES",
      15,
    );

    return {
      opensAt: new Date(booking.startsAt.getTime() - earlyMinutes * 60_000),
      closesAt: new Date(booking.endsAt.getTime() + graceMinutes * 60_000),
    };
  }

  private getUnavailableReason(
    booking: InterviewBooking,
    now: Date,
    window: JoinWindow,
  ): UnavailableReason | null {
    if (!this.isConfigured()) {
      return "NOT_CONFIGURED";
    }

    if (booking.interviewSession?.status === "ENDED") {
      return "ENDED";
    }

    if (booking.status !== "CONFIRMED" && booking.status !== "IN_PROGRESS") {
      return "NOT_CONFIRMED";
    }

    if (now < window.opensAt) {
      return "NOT_OPEN";
    }

    if (now >= window.closesAt) {
      return "WINDOW_CLOSED";
    }

    return null;
  }

  private assertJoinable(booking: InterviewBooking, now: Date) {
    const window = this.getJoinWindow(booking);
    const reason = this.getUnavailableReason(booking, now, window);

    if (reason) {
      throw this.unavailable(reason, window);
    }
  }

  private unavailable(reason: UnavailableReason, window: JoinWindow) {
    if (reason === "NOT_CONFIGURED") {
      return new AppException(
        "INTERVIEW_NOT_CONFIGURED",
        "Video interviews are not available right now. Please try again later.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (reason === "NOT_CONFIRMED") {
      return new AppException(
        "BOOKING_NOT_CONFIRMED",
        "Only confirmed bookings can join the interview.",
        HttpStatus.CONFLICT,
      );
    }

    if (reason === "NOT_OPEN") {
      return new AppException(
        "INTERVIEW_NOT_OPEN",
        "The interview room is not open yet.",
        HttpStatus.CONFLICT,
        { opensAt: window.opensAt.toISOString() },
      );
    }

    if (reason === "WINDOW_CLOSED") {
      return new AppException(
        "INTERVIEW_WINDOW_CLOSED",
        "The interview join window has closed.",
        HttpStatus.CONFLICT,
        { closesAt: window.closesAt.toISOString() },
      );
    }

    return new AppException(
      "INTERVIEW_ENDED",
      "This interview session has ended.",
      HttpStatus.CONFLICT,
    );
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.get<string>("ZOOM_VIDEO_SDK_KEY") &&
      this.config.get<string>("ZOOM_VIDEO_SDK_SECRET"),
    );
  }

  private credentials(): { key: string; secret: string } {
    const key = this.config.get<string>("ZOOM_VIDEO_SDK_KEY");
    const secret = this.config.get<string>("ZOOM_VIDEO_SDK_SECRET");

    if (!key || !secret) {
      throw this.unavailable("NOT_CONFIGURED", {
        opensAt: new Date(),
        closesAt: new Date(),
      });
    }

    return { key, secret };
  }

  private bookingNotFound() {
    return new AppException(
      "BOOKING_NOT_FOUND",
      "The booking does not exist.",
      HttpStatus.NOT_FOUND,
    );
  }
}

async function closeSessionWithinTransaction(
  tx: Prisma.TransactionClient,
  booking: InterviewBooking,
  session: { id: string; status: InterviewSessionStatus },
  endedAt: Date,
): Promise<void> {
  if (session.status === "ENDED") {
    return;
  }

  await tx.interviewSession.update({
    where: { id: session.id },
    data: { status: "ENDED", endedAt },
  });

  if (booking.status !== "IN_PROGRESS") {
    return;
  }

  await tx.booking.update({
    where: { id: booking.id },
    data: { status: "COMPLETED_PENDING_FEEDBACK" },
  });

  await tx.bookingStatusHistory.create({
    data: {
      bookingId: booking.id,
      fromStatus: "IN_PROGRESS",
      toStatus: "COMPLETED_PENDING_FEEDBACK",
      reason: "Interview ended at the scheduled time.",
    },
  });
}

export function interviewSessionName(bookingId: string): string {
  return `mockoraa-interview-${bookingId}`;
}

function isParticipant(booking: InterviewBooking, userId: string): boolean {
  return (
    booking.candidateUserId === userId ||
    booking.expertProfile.userId === userId
  );
}
