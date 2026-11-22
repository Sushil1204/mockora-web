import type { Prisma } from "@prisma/client";

export const expertProfileInclude = {
  user: {
    select: { id: true, name: true, email: true, avatarUrl: true },
  },
  experiences: { orderBy: { startDate: "desc" as const } },
  industries: {
    include: { industry: { select: { id: true, name: true, slug: true } } },
  },
  specializations: {
    include: {
      specialization: {
        select: { id: true, name: true, slug: true, industryId: true },
      },
    },
  },
  interviewTypes: {
    include: {
      interviewType: { select: { id: true, name: true, slug: true } },
    },
  },
  jobRoles: {
    include: {
      jobRole: {
        select: { id: true, name: true, slug: true, industryId: true },
      },
    },
  },
  candidateLevels: {
    include: {
      experienceLevel: { select: { id: true, name: true, sortOrder: true } },
    },
  },
  languages: true,
} satisfies Prisma.ExpertProfileInclude;

export type ExpertProfileWithRelations = Prisma.ExpertProfileGetPayload<{
  include: typeof expertProfileInclude;
}>;

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toExpertApplication(profile: ExpertProfileWithRelations) {
  return {
    id: profile.id,
    professionalHeadline: profile.professionalHeadline,
    currentDesignation: profile.currentDesignation,
    currentCompany: profile.currentCompany,
    countryCode: profile.countryCode,
    timezone: profile.timezone,
    linkedinUrl: profile.linkedinUrl,
    introduction: profile.introduction,
    yearsExperience: profile.yearsExperience,
    verificationStatus: profile.verificationStatus,
    publicationStatus: profile.publicationStatus,
    reviewNotes: profile.reviewNotes,
    reviewedAt: profile.reviewedAt?.toISOString() ?? null,
    submittedAt: profile.updatedAt.toISOString(),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    user: profile.user,
    industries: profile.industries.map((entry) => entry.industry),
    specializations: profile.specializations.map(
      (entry) => entry.specialization,
    ),
    interviewTypes: profile.interviewTypes.map((entry) => entry.interviewType),
    jobRoles: profile.jobRoles.map((entry) => entry.jobRole),
    candidateLevels: profile.candidateLevels
      .map((entry) => entry.experienceLevel)
      .sort((left, right) => left.sortOrder - right.sortOrder),
    languages: profile.languages.map((entry) => entry.languageCode),
    experiences: profile.experiences.map((experience) => ({
      id: experience.id,
      company: experience.company,
      designation: experience.designation,
      startDate: toIsoDate(experience.startDate),
      endDate: experience.endDate ? toIsoDate(experience.endDate) : null,
      description: experience.description,
    })),
  };
}

export type ExpertApplication = ReturnType<typeof toExpertApplication>;

export function isPubliclyBookable(profile: {
  verificationStatus: string;
  publicationStatus: string;
}): boolean {
  return (
    profile.verificationStatus === "APPROVED" &&
    profile.publicationStatus === "PUBLISHED"
  );
}
