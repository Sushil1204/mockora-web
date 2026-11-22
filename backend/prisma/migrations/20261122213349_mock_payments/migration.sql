-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MOCK', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MOCK',
    "provider_payment_reference" VARCHAR(160),
    "amount" INTEGER,
    "currency" VARCHAR(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "idempotency_key" VARCHAR(100),
    "paid_at" TIMESTAMPTZ(3),
    "failure_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_reference_key" ON "payments"("provider_payment_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_idempotency_key_key" ON "payments"("booking_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "payments_booking_id_status_idx" ON "payments"("booking_id", "status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
