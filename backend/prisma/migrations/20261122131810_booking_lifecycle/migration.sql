-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_EXPERT_APPROVAL', 'APPROVED_PENDING_PAYMENT', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED_PENDING_FEEDBACK', 'COMPLETED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "candidate_user_id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_amount" INTEGER,
    "currency" VARCHAR(3),
    "expert_payout_amount" INTEGER,
    "platform_amount" INTEGER,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_EXPERT_APPROVAL',
    "idempotency_key" VARCHAR(100),
    "expert_response_deadline" TIMESTAMPTZ(3) NOT NULL,
    "payment_deadline" TIMESTAMPTZ(3),
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "changed_by_user_id" UUID,
    "reason" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slot_reservations_booking_id_key" ON "slot_reservations"("booking_id");

-- CreateIndex
CREATE INDEX "bookings_candidate_user_id_status_idx" ON "bookings"("candidate_user_id", "status");

-- CreateIndex
CREATE INDEX "bookings_expert_profile_id_status_idx" ON "bookings"("expert_profile_id", "status");

-- CreateIndex
CREATE INDEX "bookings_expert_response_deadline_idx" ON "bookings"("expert_response_deadline");

-- CreateIndex
CREATE INDEX "bookings_payment_deadline_idx" ON "bookings"("payment_deadline");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_candidate_user_id_idempotency_key_key" ON "bookings"("candidate_user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_created_at_idx" ON "booking_status_history"("booking_id", "created_at");

-- AddForeignKey
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_candidate_user_id_fkey" FOREIGN KEY ("candidate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
