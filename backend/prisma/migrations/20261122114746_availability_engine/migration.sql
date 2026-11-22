-- CreateEnum
CREATE TYPE "AvailabilityExceptionType" AS ENUM ('UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SlotReservationStatus" AS ENUM ('HELD', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- CreateTable
CREATE TABLE "expert_availability_rules" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_local_time" VARCHAR(5) NOT NULL,
    "end_local_time" VARCHAR(5) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expert_availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_availability_exceptions" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "exception_type" "AvailabilityExceptionType" NOT NULL DEFAULT 'UNAVAILABLE',
    "reason" VARCHAR(280),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expert_availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_reservations" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "candidate_user_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "SlotReservationStatus" NOT NULL DEFAULT 'HELD',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "booking_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "slot_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expert_availability_rules_expert_profile_id_weekday_idx" ON "expert_availability_rules"("expert_profile_id", "weekday");

-- CreateIndex
CREATE INDEX "expert_availability_exceptions_expert_profile_id_starts_at__idx" ON "expert_availability_exceptions"("expert_profile_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "slot_reservations_expert_profile_id_starts_at_ends_at_idx" ON "slot_reservations"("expert_profile_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "slot_reservations_status_expires_at_idx" ON "slot_reservations"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "expert_availability_rules" ADD CONSTRAINT "expert_availability_rules_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_availability_exceptions" ADD CONSTRAINT "expert_availability_exceptions_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_candidate_user_id_fkey" FOREIGN KEY ("candidate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
