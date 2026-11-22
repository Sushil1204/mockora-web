import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type IndustrySeed = {
  name: string;
  slug: string;
  jobRoles: string[];
  specializations: string[];
};

const industries: IndustrySeed[] = [
  {
    name: "Technology",
    slug: "technology",
    jobRoles: [
      "Software Engineer",
      "Senior Software Engineer",
      "Engineering Manager",
      "Data Scientist",
      "DevOps Engineer",
      "QA Engineer",
      "Product Manager",
    ],
    specializations: [
      "Frontend Engineering",
      "Backend Engineering",
      "Full Stack Engineering",
      "Mobile Engineering",
      "Data Engineering",
      "Machine Learning",
      "Cloud and DevOps",
      "Security",
    ],
  },
  {
    name: "Finance",
    slug: "finance",
    jobRoles: [
      "Financial Analyst",
      "Investment Banking Analyst",
      "Risk Manager",
      "Accountant",
    ],
    specializations: [
      "Corporate Finance",
      "Investment Banking",
      "Risk Management",
      "Accounting",
    ],
  },
  {
    name: "Business and Consulting",
    slug: "business-consulting",
    jobRoles: [
      "Business Analyst",
      "Strategy Consultant",
      "Operations Manager",
      "Marketing Manager",
    ],
    specializations: [
      "Strategy",
      "Operations",
      "Marketing",
      "Product Management",
    ],
  },
  {
    name: "Design",
    slug: "design",
    jobRoles: ["Product Designer", "UX Researcher", "UI Designer"],
    specializations: [
      "UX Design",
      "UI Design",
      "Design Systems",
      "User Research",
    ],
  },
  {
    name: "Healthcare",
    slug: "healthcare",
    jobRoles: ["Physician", "Nurse Practitioner", "Healthcare Administrator"],
    specializations: [
      "Clinical Practice",
      "Healthcare Administration",
      "Public Health",
    ],
  },
  {
    name: "Operations",
    slug: "operations",
    jobRoles: ["Supply Chain Manager", "Project Manager", "Process Analyst"],
    specializations: [
      "Supply Chain",
      "Project Management",
      "Process Improvement",
    ],
  },
];

const interviewTypes = [
  { name: "Technical", slug: "technical" },
  { name: "Behavioral", slug: "behavioral" },
  { name: "HR", slug: "hr" },
  { name: "System design", slug: "system-design" },
  { name: "Domain-specific", slug: "domain-specific" },
  { name: "Case-based", slug: "case-based" },
  { name: "Leadership", slug: "leadership" },
];

const experienceLevels = [
  "Student / Intern",
  "Entry level",
  "Mid level",
  "Senior",
  "Lead / Staff",
  "Principal / Executive",
];

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main(): Promise<void> {
  for (const industrySeed of industries) {
    const industry = await prisma.industry.upsert({
      where: { slug: industrySeed.slug },
      update: {
        name: industrySeed.name,
        isActive: true,
      },
      create: {
        name: industrySeed.name,
        slug: industrySeed.slug,
      },
    });

    for (const role of industrySeed.jobRoles) {
      await prisma.jobRole.upsert({
        where: {
          industryId_slug: {
            industryId: industry.id,
            slug: toSlug(role),
          },
        },
        update: { name: role, isActive: true },
        create: {
          industryId: industry.id,
          name: role,
          slug: toSlug(role),
        },
      });
    }

    for (const specialization of industrySeed.specializations) {
      await prisma.specialization.upsert({
        where: {
          industryId_slug: {
            industryId: industry.id,
            slug: toSlug(specialization),
          },
        },
        update: { name: specialization, isActive: true },
        create: {
          industryId: industry.id,
          name: specialization,
          slug: toSlug(specialization),
        },
      });
    }
  }

  for (const interviewType of interviewTypes) {
    await prisma.interviewType.upsert({
      where: { slug: interviewType.slug },
      update: { name: interviewType.name, isActive: true },
      create: interviewType,
    });
  }

  for (const [index, name] of experienceLevels.entries()) {
    const existing = await prisma.experienceLevel.findFirst({
      where: { name },
    });

    if (existing) {
      await prisma.experienceLevel.update({
        where: { id: existing.id },
        data: { sortOrder: index + 1, isActive: true },
      });
    } else {
      await prisma.experienceLevel.create({
        data: { name, sortOrder: index + 1 },
      });
    }
  }

  console.log(
    `Taxonomy ready: ${industries.length} industries, ${interviewTypes.length} interview types, ${experienceLevels.length} experience levels.`,
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
