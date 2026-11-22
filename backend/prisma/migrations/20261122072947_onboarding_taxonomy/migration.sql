-- CreateEnum
CREATE TYPE "CareerStage" AS ENUM ('STUDENT', 'FRESHER', 'EARLY_CAREER', 'MID_CAREER', 'SENIOR', 'CAREER_SWITCHER');

-- CreateEnum
CREATE TYPE "ProfileCompletionState" AS ENUM ('INCOMPLETE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('UNPUBLISHED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "industries" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_roles" (
    "id" UUID NOT NULL,
    "industry_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specializations" (
    "id" UUID NOT NULL,
    "industry_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "interview_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_levels" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "experience_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "career_stage" "CareerStage",
    "industry_id" UUID,
    "current_role_id" UUID,
    "target_role_id" UUID,
    "years_experience" INTEGER,
    "target_level_id" UUID,
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profile_completion_state" "ProfileCompletionState" NOT NULL DEFAULT 'INCOMPLETE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "professional_headline" VARCHAR(150),
    "current_designation" VARCHAR(150),
    "current_company" VARCHAR(150),
    "country_code" VARCHAR(2),
    "timezone" VARCHAR(64),
    "linkedin_url" VARCHAR(2048),
    "introduction" TEXT,
    "years_experience" INTEGER,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expert_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_experiences" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "company" VARCHAR(150) NOT NULL,
    "designation" VARCHAR(150) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expert_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_industries" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "industry_id" UUID NOT NULL,

    CONSTRAINT "expert_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_specializations" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "specialization_id" UUID NOT NULL,

    CONSTRAINT "expert_specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_interview_types" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "interview_type_id" UUID NOT NULL,

    CONSTRAINT "expert_interview_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_job_roles" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "job_role_id" UUID NOT NULL,

    CONSTRAINT "expert_job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_candidate_levels" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "experience_level_id" UUID NOT NULL,

    CONSTRAINT "expert_candidate_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_languages" (
    "id" UUID NOT NULL,
    "expert_profile_id" UUID NOT NULL,
    "language_code" VARCHAR(16) NOT NULL,

    CONSTRAINT "expert_languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- CreateIndex
CREATE INDEX "job_roles_industry_id_idx" ON "job_roles"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_roles_industry_id_slug_key" ON "job_roles"("industry_id", "slug");

-- CreateIndex
CREATE INDEX "specializations_industry_id_idx" ON "specializations"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "specializations_industry_id_slug_key" ON "specializations"("industry_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "interview_types_slug_key" ON "interview_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_user_id_key" ON "candidate_profiles"("user_id");

-- CreateIndex
CREATE INDEX "candidate_profiles_industry_id_idx" ON "candidate_profiles"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_profiles_user_id_key" ON "expert_profiles"("user_id");

-- CreateIndex
CREATE INDEX "expert_profiles_verification_status_publication_status_idx" ON "expert_profiles"("verification_status", "publication_status");

-- CreateIndex
CREATE INDEX "expert_experiences_expert_profile_id_idx" ON "expert_experiences"("expert_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_industries_expert_profile_id_industry_id_key" ON "expert_industries"("expert_profile_id", "industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_specializations_expert_profile_id_specialization_id_key" ON "expert_specializations"("expert_profile_id", "specialization_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_interview_types_expert_profile_id_interview_type_id_key" ON "expert_interview_types"("expert_profile_id", "interview_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_job_roles_expert_profile_id_job_role_id_key" ON "expert_job_roles"("expert_profile_id", "job_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_candidate_levels_expert_profile_id_experience_level__key" ON "expert_candidate_levels"("expert_profile_id", "experience_level_id");

-- CreateIndex
CREATE UNIQUE INDEX "expert_languages_expert_profile_id_language_code_key" ON "expert_languages"("expert_profile_id", "language_code");

-- AddForeignKey
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specializations" ADD CONSTRAINT "specializations_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_current_role_id_fkey" FOREIGN KEY ("current_role_id") REFERENCES "job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_target_role_id_fkey" FOREIGN KEY ("target_role_id") REFERENCES "job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_target_level_id_fkey" FOREIGN KEY ("target_level_id") REFERENCES "experience_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_experiences" ADD CONSTRAINT "expert_experiences_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_industries" ADD CONSTRAINT "expert_industries_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_industries" ADD CONSTRAINT "expert_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_specializations" ADD CONSTRAINT "expert_specializations_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_specializations" ADD CONSTRAINT "expert_specializations_specialization_id_fkey" FOREIGN KEY ("specialization_id") REFERENCES "specializations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_interview_types" ADD CONSTRAINT "expert_interview_types_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_interview_types" ADD CONSTRAINT "expert_interview_types_interview_type_id_fkey" FOREIGN KEY ("interview_type_id") REFERENCES "interview_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_job_roles" ADD CONSTRAINT "expert_job_roles_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_job_roles" ADD CONSTRAINT "expert_job_roles_job_role_id_fkey" FOREIGN KEY ("job_role_id") REFERENCES "job_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_candidate_levels" ADD CONSTRAINT "expert_candidate_levels_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_candidate_levels" ADD CONSTRAINT "expert_candidate_levels_experience_level_id_fkey" FOREIGN KEY ("experience_level_id") REFERENCES "experience_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_languages" ADD CONSTRAINT "expert_languages_expert_profile_id_fkey" FOREIGN KEY ("expert_profile_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
