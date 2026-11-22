import type { NotificationType, Prisma } from "@prisma/client";

export type NotificationEventInput = {
  key: string;
  type: NotificationType;
  bookingId: string;
  data?: Prisma.InputJsonValue;
};

/**
 * Writes a deduplicated event to the transactional outbox. Notification
 * recipient and delivery failures are handled after the booking transaction
 * commits, so they cannot roll it back.
 */
export async function enqueueNotificationEvent(
  tx: Prisma.TransactionClient,
  input: NotificationEventInput,
): Promise<void> {
  await tx.notificationEvent.upsert({
    where: { dedupeKey: input.key },
    create: {
      dedupeKey: input.key,
      type: input.type,
      bookingId: input.bookingId,
      data: input.data,
    },
    update: {},
  });
}
