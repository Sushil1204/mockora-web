import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  NotificationEventStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AppException } from "../common/errors/app.exception";
import type { ListNotificationsQuery } from "./notifications.schemas";

const notificationBookingSelect = {
  id: true,
  candidateUserId: true,
  status: true,
  startsAt: true,
  endsAt: true,
  timezone: true,
  paymentDeadline: true,
  candidate: { select: { name: true } },
  expertProfile: {
    select: {
      userId: true,
      user: { select: { name: true } },
    },
  },
  history: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { reason: true },
  },
} satisfies Prisma.BookingSelect;

type NotificationBooking = Prisma.BookingGetPayload<{
  select: typeof notificationBookingSelect;
}>;

type RecipientMessage = {
  userId: string;
  title: string;
  body: string;
  data: Prisma.InputJsonValue;
};

const MAX_EVENT_ATTEMPTS = 5;
const EVENT_RETRY_BASE_MS = 30_000;
const EVENT_RETRY_MAX_MS = 60 * 60_000;
const DELIVERY_RETRY_MS = 60_000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listNotifications(userId: string, query: ListNotificationsQuery) {
    const where: Prisma.NotificationWhereInput = { userId };

    if (query.unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      notifications: notifications.map(toNotificationResponse),
      unreadCount,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new AppException(
        "NOTIFICATION_NOT_FOUND",
        "The notification does not exist.",
        HttpStatus.NOT_FOUND,
      );
    }

    if (notification.readAt) {
      return { notification: toNotificationResponse(notification) };
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });

    return { notification: toNotificationResponse(updated) };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  /**
   * Creates due reminder events without depending on a browser session.
   * Unique dedupe keys make repeated scheduler runs harmless.
   */
  async enqueueDueReminders(now = new Date()): Promise<number> {
    const paymentThreshold = new Date(now.getTime() + 15 * 60_000);
    const interviewThreshold = new Date(now.getTime() + 60 * 60_000);
    const feedbackDelayHours = this.config.get<number>(
      "FEEDBACK_REMINDER_DELAY_HOURS",
      24,
    );
    const feedbackThreshold = new Date(
      now.getTime() - feedbackDelayHours * 60 * 60_000,
    );

    const [paymentDue, interviewDue, feedbackDue] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          status: "APPROVED_PENDING_PAYMENT",
          paymentDeadline: { gt: now, lte: paymentThreshold },
        },
        select: { id: true, paymentDeadline: true },
        take: 100,
      }),
      this.prisma.booking.findMany({
        where: {
          status: "CONFIRMED",
          startsAt: { gt: now, lte: interviewThreshold },
        },
        select: { id: true, startsAt: true, timezone: true },
        take: 100,
      }),
      this.prisma.booking.findMany({
        where: {
          status: "COMPLETED_PENDING_FEEDBACK",
          feedbackReport: null,
          interviewSession: {
            is: { status: "ENDED", endedAt: { lte: feedbackThreshold } },
          },
        },
        select: {
          id: true,
          interviewSession: { select: { endedAt: true } },
        },
        take: 100,
      }),
    ]);

    const events: Prisma.NotificationEventCreateManyInput[] = [
      ...paymentDue.map((booking) => ({
        dedupeKey: `payment-deadline:${booking.id}`,
        type: "PAYMENT_DEADLINE_REMINDER" as const,
        bookingId: booking.id,
        data: {
          paymentDeadline: booking.paymentDeadline?.toISOString() ?? null,
        },
      })),
      ...interviewDue.map((booking) => ({
        dedupeKey: `interview-reminder:${booking.id}`,
        type: "INTERVIEW_REMINDER" as const,
        bookingId: booking.id,
        data: {
          startsAt: booking.startsAt.toISOString(),
          timezone: booking.timezone,
        },
      })),
      ...feedbackDue.map((booking) => ({
        dedupeKey: `feedback-reminder:${booking.id}`,
        type: "FEEDBACK_REMINDER" as const,
        bookingId: booking.id,
        data: {
          endedAt: booking.interviewSession?.endedAt?.toISOString() ?? null,
        },
      })),
    ];

    if (events.length === 0) {
      return 0;
    }

    const result = await this.prisma.notificationEvent.createMany({
      data: events,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Converts pending outbox events into per-user notifications and delivery
   * rows. Each event is retried independently with bounded backoff.
   */
  async dispatchPendingEvents(limit = 50): Promise<number> {
    const events = await this.prisma.notificationEvent.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true },
    });

    for (const event of events) {
      await this.processEvent(event.id);
    }

    return events.length;
  }

  /** Retries undelivered in-app notifications without touching booking state. */
  async deliverPendingNotifications(limit = 100): Promise<number> {
    const now = new Date();
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: {
        channel: "IN_APP",
        OR: [
          { status: "PENDING" },
          {
            status: "FAILED",
            nextAttemptAt: { lte: now },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, notificationId: true },
    });

    for (const delivery of deliveries) {
      try {
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "SENT",
            sentAt: now,
            attemptCount: { increment: 1 },
            lastError: null,
            nextAttemptAt: null,
          },
        });
      } catch (error) {
        await this.prisma.notificationDelivery
          .update({
            where: { id: delivery.id },
            data: {
              status: "FAILED",
              attemptCount: { increment: 1 },
              lastError: toErrorMessage(error),
              nextAttemptAt: new Date(now.getTime() + DELIVERY_RETRY_MS),
            },
          })
          .catch(() => undefined);
      }
    }

    return deliveries.length;
  }

  /** Best-effort post-commit dispatch used by booking and payment requests. */
  async dispatchSafely(): Promise<void> {
    try {
      await this.dispatchPendingEvents();
      await this.deliverPendingNotifications();
    } catch (error) {
      this.logger.error(
        "Notification dispatch failed; the booking operation remains committed.",
        error as Error,
      );
    }
  }

  /** Test and scheduler entry point for all notification maintenance. */
  async runMaintenance(now = new Date()): Promise<void> {
    await this.enqueueDueReminders(now);
    await this.dispatchPendingEvents();
    await this.deliverPendingNotifications();
  }

  private async processEvent(eventId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const event = await tx.notificationEvent.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            type: true,
            data: true,
            status: true,
            booking: { select: notificationBookingSelect },
          },
        });

        if (!event || event.status !== "PENDING") {
          return;
        }

        const recipients = event.booking
          ? buildRecipients(event.type, event.data, event.booking)
          : [];

        for (const recipient of recipients) {
          const notification = await tx.notification.upsert({
            where: {
              eventId_userId: { eventId: event.id, userId: recipient.userId },
            },
            create: {
              eventId: event.id,
              userId: recipient.userId,
              type: event.type,
              title: recipient.title,
              body: recipient.body,
              data: recipient.data,
            },
            update: {},
            select: { id: true },
          });

          await tx.notificationDelivery.upsert({
            where: {
              notificationId_channel: {
                notificationId: notification.id,
                channel: "IN_APP",
              },
            },
            create: { notificationId: notification.id },
            update: {},
          });
        }

        await tx.notificationEvent.update({
          where: { id: event.id },
          data: {
            status: "PROCESSED",
            processedAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        });
      });
    } catch (error) {
      await this.recordEventFailure(eventId, error);
    }
  }

  private async recordEventFailure(
    eventId: string,
    error: unknown,
  ): Promise<void> {
    const event = await this.prisma.notificationEvent.findUnique({
      where: { id: eventId },
      select: { attempts: true },
    });

    if (!event) {
      return;
    }

    const attempts = event.attempts + 1;
    const status: NotificationEventStatus =
      attempts >= MAX_EVENT_ATTEMPTS ? "FAILED" : "PENDING";
    const retryDelay = Math.min(
      EVENT_RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1),
      EVENT_RETRY_MAX_MS,
    );

    await this.prisma.notificationEvent
      .update({
        where: { id: eventId },
        data: {
          status,
          attempts,
          lastError: toErrorMessage(error),
          availableAt: new Date(Date.now() + retryDelay),
        },
      })
      .catch(() => undefined);
  }
}

function buildRecipients(
  type: NotificationType,
  eventData: Prisma.JsonValue | null,
  booking: NotificationBooking,
): RecipientMessage[] {
  const candidateId = booking.candidateUserId;
  const expertId = booking.expertProfile.userId;
  const candidateName = booking.candidate.name;
  const expertName = booking.expertProfile.user.name;
  const reason =
    readJsonString(eventData, "reason") ??
    booking.history[0]?.reason ??
    "The booking status changed.";
  const bookingData = { bookingId: booking.id };

  switch (type) {
    case "BOOKING_REQUESTED":
      return [
        {
          userId: expertId,
          title: "New booking request",
          body: `${candidateName} requested a mock interview. Review the request before the expert response deadline.`,
          data: {
            ...bookingData,
            expertResponseDeadline: readJsonString(
              eventData,
              "expertResponseDeadline",
            ),
          },
        },
      ];
    case "BOOKING_APPROVED":
      return [
        {
          userId: candidateId,
          title: "Booking request approved",
          body: `${expertName} approved your request. Complete payment before the deadline to confirm the interview.`,
          data: {
            ...bookingData,
            paymentDeadline:
              readJsonString(eventData, "paymentDeadline") ??
              booking.paymentDeadline?.toISOString() ??
              null,
          },
        },
      ];
    case "BOOKING_DECLINED":
      return [
        {
          userId: candidateId,
          title: "Booking request declined",
          body: `${expertName} declined your request. ${reason}`,
          data: { ...bookingData, reason },
        },
      ];
    case "PAYMENT_DEADLINE_REMINDER":
      return [
        {
          userId: candidateId,
          title: "Payment deadline approaching",
          body: `Complete the mock payment for your interview with ${expertName} before the booking expires.`,
          data: {
            ...bookingData,
            paymentDeadline:
              readJsonString(eventData, "paymentDeadline") ??
              booking.paymentDeadline?.toISOString() ??
              null,
          },
        },
      ];
    case "BOOKING_CONFIRMED":
      return [
        {
          userId: candidateId,
          title: "Booking confirmed",
          body: `Your mock interview with ${expertName} is confirmed. The slot is secured.`,
          data: {
            ...bookingData,
            startsAt: booking.startsAt.toISOString(),
            timezone: booking.timezone,
          },
        },
        {
          userId: expertId,
          title: "New confirmed interview",
          body: `${candidateName}'s mock interview is confirmed. View the session details in your workspace.`,
          data: {
            ...bookingData,
            startsAt: booking.startsAt.toISOString(),
            timezone: booking.timezone,
          },
        },
      ];
    case "BOOKING_EXPIRED":
      return [
        {
          userId: candidateId,
          title: "Booking expired",
          body: `Your booking request with ${expertName} expired. ${reason} Please book another session.`,
          data: { ...bookingData, reason },
        },
        {
          userId: expertId,
          title: "Booking request expired",
          body: `The booking request from ${candidateName} expired. ${reason}`,
          data: { ...bookingData, reason },
        },
      ];
    case "FEEDBACK_REQUESTED":
      return [
        {
          userId: expertId,
          title: "Feedback requested",
          body: `Your interview with ${candidateName} has ended. Submit the feedback report so the candidate can receive their results.`,
          data: { ...bookingData, endsAt: booking.endsAt.toISOString() },
        },
      ];
    case "FEEDBACK_REMINDER":
      return [
        {
          userId: expertId,
          title: "Feedback still pending",
          body: `The feedback report for your interview with ${candidateName} is still pending. Submit it to complete the booking.`,
          data: {
            ...bookingData,
            endedAt: readJsonString(eventData, "endedAt"),
          },
        },
      ];
    case "FEEDBACK_SUBMITTED":
      return [
        {
          userId: candidateId,
          title: "Your feedback report is ready",
          body: `${expertName} submitted your interview feedback. Review your scores, strengths, and improvement areas.`,
          data: { ...bookingData },
        },
      ];
    case "INTERVIEW_REMINDER":
      return [
        {
          userId: candidateId,
          title: "Interview starting soon",
          body: `Your mock interview with ${expertName} starts soon. Review the booking details.`,
          data: {
            ...bookingData,
            startsAt:
              readJsonString(eventData, "startsAt") ??
              booking.startsAt.toISOString(),
            timezone: booking.timezone,
          },
        },
        {
          userId: expertId,
          title: "Interview starting soon",
          body: `Your mock interview with ${candidateName} starts soon. Review the booking details.`,
          data: {
            ...bookingData,
            startsAt:
              readJsonString(eventData, "startsAt") ??
              booking.startsAt.toISOString(),
            timezone: booking.timezone,
          },
        },
      ];
  }
}

function readJsonString(
  value: Prisma.JsonValue | null,
  key: string,
): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const field = value[key];
  return typeof field === "string" ? field : null;
}

function toNotificationResponse(notification: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Prisma.JsonValue | null;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    readAt: notification.readAt?.toISOString() ?? null,
    isRead: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Notification delivery failed.";
}
