import type { Prisma } from "@prisma/client";

const publicUserSelect = {
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export const publicExpertCardInclude = {
  user: { select: publicUserSelect },
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
  languages: {
    select: { languageCode: true },
    orderBy: { languageCode: "asc" as const },
  },
} satisfies Prisma.ExpertProfileInclude;

export const publicExpertProfileInclude = {
  ...publicExpertCardInclude,
  experiences: { orderBy: { startDate: "desc" as const } },
} satisfies Prisma.ExpertProfileInclude;

export type PublicExpertCardRecord = Prisma.ExpertProfileGetPayload<{
  include: typeof publicExpertCardInclude;
}>;

export type PublicExpertProfileRecord = Prisma.ExpertProfileGetPayload<{
  include: typeof publicExpertProfileInclude;
}>;

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toCardFields(profile: PublicExpertCardRecord) {
  return {
    id: profile.id,
    professionalHeadline: profile.professionalHeadline,
    currentDesignation: profile.currentDesignation,
    currentCompany: profile.currentCompany,
    countryCode: profile.countryCode,
    timezone: profile.timezone,
    yearsExperience: profile.yearsExperience,
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
  };
}

export function toPublicExpertCard(profile: PublicExpertCardRecord) {
  return toCardFields(profile);
}

export function toPublicExpertProfile(profile: PublicExpertProfileRecord) {
  return {
    ...toCardFields(profile),
    introduction: profile.introduction,
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

export type PublicExpertCard = ReturnType<typeof toPublicExpertCard>;
export type PublicExpertProfile = ReturnType<typeof toPublicExpertProfile>;

export function toLanguageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
