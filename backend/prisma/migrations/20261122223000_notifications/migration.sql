-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_REQUESTED', 'BOOKING_APPROVED', 'BOOKING_DECLINED', 'PAYMENT_DEADLINE_REMINDER', 'BOOKING_CONFIRMED', 'BOOKING_EXPIRED', 'INTERVIEW_REMINDER');

-- CreateEnum
CREATE TYPE "NotificationEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "notification_events" (
    "id" UUID NOT NULL,
    "dedupe_key" VARCHAR(160) NOT NULL,
    "type" "NotificationType" NOT NULL,
    "booking_id" UUID,
    "data" JSONB,
    "status" "NotificationEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMPTZ(3),
    "next_attempt_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_events_dedupe_key_key" ON "notification_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "notification_events_status_available_at_idx" ON "notification_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "notification_events_booking_id_idx" ON "notification_events"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_id_user_id_key" ON "notifications"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notification_id_channel_key" ON "notification_deliveries"("notification_id", "channel");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_next_attempt_at_idx" ON "notification_deliveries"("status", "next_attempt_at");

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "notification_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
