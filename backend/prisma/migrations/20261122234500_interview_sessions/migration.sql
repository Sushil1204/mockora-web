-- CreateEnum
CREATE TYPE "InterviewSessionProvider" AS ENUM ('ZOOM_VIDEO_SDK');

-- CreateEnum
CREATE TYPE "InterviewSessionStatus" AS ENUM ('READY', 'IN_PROGRESS', 'ENDED');

-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "provider" "InterviewSessionProvider" NOT NULL DEFAULT 'ZOOM_VIDEO_SDK',
    "provider_session_reference" VARCHAR(200) NOT NULL,
    "status" "InterviewSessionStatus" NOT NULL DEFAULT 'READY',
    "started_at" TIMESTAMPTZ(3),
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interview_sessions_booking_id_key" ON "interview_sessions"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_sessions_provider_session_reference_key" ON "interview_sessions"("provider_session_reference");

-- CreateIndex
CREATE INDEX "interview_sessions_status_idx" ON "interview_sessions"("status");

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
