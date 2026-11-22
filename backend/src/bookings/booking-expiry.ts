import type { BookingStatus, Prisma } from "@prisma/client";

import { enqueueNotificationEvent } from "../notifications/notification-events";

const EXPIRABLE_STATUSES: BookingStatus[] = [
  "PENDING_EXPERT_APPROVAL",
  "APPROVED_PENDING_PAYMENT",
];

/**
 * Expires a booking, releases its hold, and cancels any open payment attempts.
 * Uses a status-guarded update so a concurrent confirmation cannot be undone.
 */
export async function expireBookingWithinTransaction(
  tx: Prisma.TransactionClient,
  booking: { id: string; status: BookingStatus },
  reason: string,
): Promise<boolean> {
  if (!EXPIRABLE_STATUSES.includes(booking.status)) {
    return false;
  }

  const updated = await tx.booking.updateMany({
    where: { id: booking.id, status: booking.status },
    data: { status: "EXPIRED" },
  });

  if (updated.count === 0) {
    return false;
  }

  await tx.slotReservation.updateMany({
    where: { bookingId: booking.id, status: "HELD" },
    data: { status: "EXPIRED" },
  });

  await tx.payment.updateMany({
    where: {
      bookingId: booking.id,
      status: { in: ["CREATED", "PENDING"] },
    },
    data: {
      status: "CANCELLED",
      failureReason: "Booking expired before payment completed.",
    },
  });

  await tx.bookingStatusHistory.create({
    data: {
      bookingId: booking.id,
      fromStatus: booking.status,
      toStatus: "EXPIRED",
      reason,
    },
  });

  await enqueueNotificationEvent(tx, {
    key: `booking-expired:${booking.id}`,
    type: "BOOKING_EXPIRED",
    bookingId: booking.id,
    data: { reason },
  });

  return true;
}
