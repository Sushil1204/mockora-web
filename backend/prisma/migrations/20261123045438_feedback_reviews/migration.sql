-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_SUBMITTED';

-- CreateTable
CREATE TABLE "feedback_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feedback_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_criteria" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "feedback_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_reports" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "expert_user_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "overall_summary" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "improvement_areas" TEXT NOT NULL,
    "recommendations" TEXT,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_scores" (
    "id" UUID NOT NULL,
    "feedback_report_id" UUID NOT NULL,
    "criterion_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "evidence_comment" TEXT,

    CONSTRAINT "feedback_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "candidate_user_id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_templates_name_version_key" ON "feedback_templates"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_criteria_template_id_sort_order_key" ON "feedback_criteria"("template_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_reports_booking_id_key" ON "feedback_reports"("booking_id");

-- CreateIndex
CREATE INDEX "feedback_reports_expert_user_id_idx" ON "feedback_reports"("expert_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_scores_feedback_report_id_criterion_id_key" ON "feedback_scores"("feedback_report_id", "criterion_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_expert_profile_id_created_at_idx" ON "reviews"("expert_profile_id", "created_at");

-- AddForeignKey
ALTER TABLE "feedback_criteria" ADD CONSTRAINT "feedback_criteria_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "feedback_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_expert_user_id_fkey" FOREIGN KEY ("expert_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "feedback_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_scores" ADD CONSTRAINT "feedback_scores_feedback_report_id_fkey" FOREIGN KEY ("feedback_report_id") REFERENCES "feedback_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_scores" ADD CONSTRAINT "feedback_scores_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "feedback_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_candidate_user_id_fkey" FOREIGN KEY ("candidate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
