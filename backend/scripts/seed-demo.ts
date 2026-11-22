import "dotenv/config";

import { PrismaClient, type Prisma, type Role } from "@prisma/client";
import { hash } from "bcryptjs";

import {
  addDays,
  formatIsoDate,
  zonedDateTimeToUtc,
} from "../src/availability/timezone";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "MockoraaDemo!2026";
const ADMIN_EMAIL = "admin@mockoraa.com";

type AvailabilitySeed = {
  weekdays: number[];
  startLocalTime: string;
  endLocalTime: string;
  slotDurationMinutes: number;
};

type ExpertSeed = {
  email: string;
  name: string;
  countryCode: string;
  preferredLanguage: string;
  timezone: string;
  professionalHeadline: string;
  currentDesignation: string;
  currentCompany: string;
  introduction: string;
  yearsExperience: number;
  industrySlug: string;
  specializationSlugs: string[];
  interviewTypeSlugs: string[];
  jobRoleSlug: string;
  levelNames: string[];
  languageCodes: string[];
  verificationStatus: "APPROVED" | "SUBMITTED";
  publicationStatus: "PUBLISHED" | "UNPUBLISHED";
  availability: AvailabilitySeed | null;
  blockedDateOffset?: number;
};

const experts: ExpertSeed[] = [
  {
    email: "aarav@mockoraa.com",
    name: "Aarav Mehta",
    countryCode: "IN",
    preferredLanguage: "en",
    timezone: "Asia/Kolkata",
    professionalHeadline: "Staff backend engineer and interview coach",
    currentDesignation: "Staff Software Engineer",
    currentCompany: "Razorpay",
    introduction:
      "I have spent ten years building payment and platform systems. I coach engineers on backend fundamentals, system design, and communicating trade-offs clearly.",
    yearsExperience: 10,
    industrySlug: "technology",
    specializationSlugs: ["backend-engineering", "full-stack-engineering"],
    interviewTypeSlugs: ["technical", "system-design", "behavioral"],
    jobRoleSlug: "senior-software-engineer",
    levelNames: ["Mid level", "Senior", "Lead / Staff"],
    languageCodes: ["en", "hi"],
    verificationStatus: "APPROVED",
    publicationStatus: "PUBLISHED",
    availability: {
      weekdays: [1, 2, 3, 4, 5],
      startLocalTime: "18:30",
      endLocalTime: "21:30",
      slotDurationMinutes: 45,
    },
    blockedDateOffset: 5,
  },
  {
    email: "bianca@mockoraa.com",
    name: "Bianca Rossi",
    countryCode: "DE",
    preferredLanguage: "en",
    timezone: "Europe/Berlin",
    professionalHeadline: "Product design lead and portfolio reviewer",
    currentDesignation: "Product Design Lead",
    currentCompany: "Zalando",
    introduction:
      "I help designers turn ambiguous briefs into clear product stories. My sessions cover portfolio narratives, case-study structure, and design critique.",
    yearsExperience: 9,
    industrySlug: "design",
    specializationSlugs: ["ux-design", "user-research", "design-systems"],
    interviewTypeSlugs: ["behavioral", "case-based", "leadership"],
    jobRoleSlug: "product-designer",
    levelNames: ["Mid level", "Senior", "Lead / Staff"],
    languageCodes: ["en", "de"],
    verificationStatus: "APPROVED",
    publicationStatus: "PUBLISHED",
    availability: {
      weekdays: [2, 4],
      startLocalTime: "09:00",
      endLocalTime: "12:00",
      slotDurationMinutes: 60,
    },
  },
  {
    email: "chen@mockoraa.com",
    name: "Chen Wei",
    countryCode: "US",
    preferredLanguage: "en",
    timezone: "America/New_York",
    professionalHeadline: "Machine learning engineer and data interview coach",
    currentDesignation: "Machine Learning Engineer",
    currentCompany: "Stripe",
    introduction:
      "I work on fraud detection and ranking systems. I run practical sessions on ML fundamentals, experimentation, and data-focused system design.",
    yearsExperience: 7,
    industrySlug: "technology",
    specializationSlugs: ["machine-learning", "data-engineering"],
    interviewTypeSlugs: ["technical", "system-design", "domain-specific"],
    jobRoleSlug: "data-scientist",
    levelNames: ["Senior", "Lead / Staff"],
    languageCodes: ["en"],
    verificationStatus: "APPROVED",
    publicationStatus: "PUBLISHED",
    availability: {
      weekdays: [1, 3, 5],
      startLocalTime: "08:00",
      endLocalTime: "11:00",
      slotDurationMinutes: 30,
    },
  },
  {
    email: "deepa@mockoraa.com",
    name: "Deepa Nair",
    countryCode: "IN",
    preferredLanguage: "en",
    timezone: "Asia/Kolkata",
    professionalHeadline: "Engineering manager and leadership coach",
    currentDesignation: "Engineering Manager",
    currentCompany: "Atlassian",
    introduction:
      "I coach engineers preparing for their first management role and managers working on feedback, hiring, and team design.",
    yearsExperience: 12,
    industrySlug: "technology",
    specializationSlugs: ["backend-engineering"],
    interviewTypeSlugs: ["leadership", "behavioral"],
    jobRoleSlug: "engineering-manager",
    levelNames: ["Senior", "Lead / Staff"],
    languageCodes: ["en"],
    verificationStatus: "SUBMITTED",
    publicationStatus: "UNPUBLISHED",
    availability: null,
  },
];

async function ensureUser(
  email: string,
  name: string,
  countryCode: string,
  preferredLanguage: string,
  passwordHash: string,
  roles: Role[],
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      countryCode,
      preferredLanguage,
      passwordHash,
      emailVerifiedAt: new Date(),
      accountStatus: "ACTIVE",
    },
    create: {
      email,
      name,
      countryCode,
      preferredLanguage,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  for (const role of roles) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: { status: "ACTIVE" },
      create: { userId: user.id, role },
    });
  }

  return user;
}

async function seedCandidate(passwordHash: string) {
  const industry = await prisma.industry.findUniqueOrThrow({
    where: { slug: "technology" },
  });
  const currentRole = await prisma.jobRole.findUniqueOrThrow({
    where: {
      industryId_slug: { industryId: industry.id, slug: "software-engineer" },
    },
  });
  const targetRole = await prisma.jobRole.findUniqueOrThrow({
    where: {
      industryId_slug: {
        industryId: industry.id,
        slug: "senior-software-engineer",
      },
    },
  });
  const targetLevel = await prisma.experienceLevel.findFirstOrThrow({
    where: { name: "Mid level" },
  });

  const user = await ensureUser(
    "candidate@mockoraa.com",
    "Priya Sharma",
    "IN",
    "en",
    passwordHash,
    ["CANDIDATE"],
  );

  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: {
      careerStage: "EARLY_CAREER",
      industryId: industry.id,
      currentRoleId: currentRole.id,
      targetRoleId: targetRole.id,
      yearsExperience: 3,
      targetLevelId: targetLevel.id,
      goals: [
        "Move into a senior backend role",
        "Improve system design interviews",
      ],
      profileCompletionState: "COMPLETE",
    },
    create: {
      userId: user.id,
      careerStage: "EARLY_CAREER",
      industryId: industry.id,
      currentRoleId: currentRole.id,
      targetRoleId: targetRole.id,
      yearsExperience: 3,
      targetLevelId: targetLevel.id,
      goals: [
        "Move into a senior backend role",
        "Improve system design interviews",
      ],
      profileCompletionState: "COMPLETE",
    },
  });

  return user;
}

async function seedExpert(
  seed: ExpertSeed,
  passwordHash: string,
  adminId: string | null,
) {
  const industry = await prisma.industry.findUniqueOrThrow({
    where: { slug: seed.industrySlug },
  });
  const jobRole = await prisma.jobRole.findUniqueOrThrow({
    where: {
      industryId_slug: {
        industryId: industry.id,
        slug: seed.jobRoleSlug,
      },
    },
  });
  const specializations = await Promise.all(
    seed.specializationSlugs.map((slug) =>
      prisma.specialization.findUniqueOrThrow({
        where: {
          industryId_slug: { industryId: industry.id, slug },
        },
      }),
    ),
  );
  const interviewTypes = await Promise.all(
    seed.interviewTypeSlugs.map((slug) =>
      prisma.interviewType.findUniqueOrThrow({ where: { slug } }),
    ),
  );
  const levels = await Promise.all(
    seed.levelNames.map((name) =>
      prisma.experienceLevel.findFirstOrThrow({ where: { name } }),
    ),
  );

  const user = await ensureUser(
    seed.email,
    seed.name,
    seed.countryCode,
    seed.preferredLanguage,
    passwordHash,
    ["CANDIDATE", "EXPERT"],
  );

  const profileData = {
    professionalHeadline: seed.professionalHeadline,
    currentDesignation: seed.currentDesignation,
    currentCompany: seed.currentCompany,
    countryCode: seed.countryCode,
    timezone: seed.timezone,
    introduction: seed.introduction,
    yearsExperience: seed.yearsExperience,
    verificationStatus: seed.verificationStatus,
    publicationStatus: seed.publicationStatus,
    reviewedById: seed.verificationStatus === "APPROVED" ? adminId : undefined,
    reviewedAt: seed.verificationStatus === "APPROVED" ? new Date() : undefined,
  } satisfies Omit<Prisma.ExpertProfileUncheckedCreateInput, "userId">;

  const profile = await prisma.expertProfile.upsert({
    where: { userId: user.id },
    update: profileData,
    create: { ...profileData, userId: user.id },
  });

  await prisma.$transaction([
    prisma.expertIndustry.deleteMany({
      where: { expertProfileId: profile.id },
    }),
    prisma.expertSpecialization.deleteMany({
      where: { expertProfileId: profile.id },
    }),
    prisma.expertInterviewType.deleteMany({
      where: { expertProfileId: profile.id },
    }),
    prisma.expertJobRole.deleteMany({
      where: { expertProfileId: profile.id },
    }),
    prisma.expertCandidateLevel.deleteMany({
      where: { expertProfileId: profile.id },
    }),
    prisma.expertLanguage.deleteMany({
      where: { expertProfileId: profile.id },
    }),
    prisma.expertAvailabilityRule.deleteMany({
      where: { expertProfileId: profile.id },
    }),
    prisma.expertAvailabilityException.deleteMany({
      where: { expertProfileId: profile.id },
    }),
  ]);

  await prisma.expertIndustry.create({
    data: { expertProfileId: profile.id, industryId: industry.id },
  });
  await prisma.expertJobRole.create({
    data: { expertProfileId: profile.id, jobRoleId: jobRole.id },
  });
  await prisma.expertSpecialization.createMany({
    data: specializations.map((specialization) => ({
      expertProfileId: profile.id,
      specializationId: specialization.id,
    })),
  });
  await prisma.expertInterviewType.createMany({
    data: interviewTypes.map((interviewType) => ({
      expertProfileId: profile.id,
      interviewTypeId: interviewType.id,
    })),
  });
  await prisma.expertCandidateLevel.createMany({
    data: levels.map((level) => ({
      expertProfileId: profile.id,
      experienceLevelId: level.id,
    })),
  });
  await prisma.expertLanguage.createMany({
    data: seed.languageCodes.map((languageCode) => ({
      expertProfileId: profile.id,
      languageCode,
    })),
  });

  const availability = seed.availability;

  if (availability) {
    const today = formatIsoDate(new Date());
    const effectiveFrom = new Date(`${today}T00:00:00.000Z`);
    const effectiveUntil = new Date(`${addDays(today, 180)}T00:00:00.000Z`);

    await prisma.expertAvailabilityRule.createMany({
      data: availability.weekdays.map((weekday) => ({
        expertProfileId: profile.id,
        weekday,
        startLocalTime: availability.startLocalTime,
        endLocalTime: availability.endLocalTime,
        timezone: seed.timezone,
        slotDurationMinutes: availability.slotDurationMinutes,
        effectiveFrom,
        effectiveUntil,
      })),
    });

    if (seed.blockedDateOffset !== undefined) {
      const blockedDate = addDays(today, seed.blockedDateOffset);
      const startsAt = zonedDateTimeToUtc(blockedDate, "00:00", seed.timezone);
      const endsAt = zonedDateTimeToUtc(
        addDays(blockedDate, 1),
        "00:00",
        seed.timezone,
      );

      if (!startsAt || !endsAt) {
        throw new Error(
          `Could not compute the blocked date for ${seed.email}.`,
        );
      }

      await prisma.expertAvailabilityException.create({
        data: {
          expertProfileId: profile.id,
          startsAt,
          endsAt,
          reason: "Team offsite",
        },
      });
    }
  }

  return { user, profile };
}

async function main(): Promise<void> {
  if (DEMO_PASSWORD.length < 12) {
    throw new Error("DEMO_PASSWORD must be at least 12 characters.");
  }

  const passwordHash = await hash(DEMO_PASSWORD, 12);
  const admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  const candidate = await seedCandidate(passwordHash);
  const results = [];

  for (const seed of experts) {
    results.push(await seedExpert(seed, passwordHash, admin?.id ?? null));
  }

  console.log(
    [
      `Demo data ready (password for all demo accounts: ${DEMO_PASSWORD}).`,
      `Candidate: ${candidate.email}`,
      ...results.map(
        ({ user, profile }) =>
          `Expert: ${user.email} (${profile.publicationStatus.toLowerCase()}, /experts/${profile.id})`,
      ),
    ].join("\n"),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
