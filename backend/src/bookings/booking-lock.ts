import type { Prisma } from "@prisma/client";

/**
 * Serializes all state changes for one booking. Every booking and payment
 * transition takes this lock before reading the booking's current state.
 */
export async function lockBooking(
  tx: Prisma.TransactionClient,
  bookingId: string,
) {
  const lockKey = `booking:${bookingId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text))`;
}
