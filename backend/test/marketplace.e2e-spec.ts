import type { INestApplication } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import request from "supertest";

import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, resetDatabase } from "./test-utils";

describe("Expert marketplace (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function seedTaxonomy() {
    const technology = await prisma.industry.create({
      data: { name: "Technology", slug: "technology" },
    });
    const finance = await prisma.industry.create({
      data: { name: "Finance", slug: "finance" },
    });
    const softwareEngineer = await prisma.jobRole.create({
      data: {
        industryId: technology.id,
        name: "Software Engineer",
        slug: "software-engineer",
      },
    });
    const financialAnalyst = await prisma.jobRole.create({
      data: {
        industryId: finance.id,
        name: "Financial Analyst",
        slug: "financial-analyst",
      },
    });
    const backend = await prisma.specialization.create({
      data: {
        industryId: technology.id,
        name: "Backend Engineering",
        slug: "backend-engineering",
      },
    });
    const frontend = await prisma.specialization.create({
      data: {
        industryId: technology.id,
        name: "Frontend Engineering",
        slug: "frontend-engineering",
      },
    });
    const quant = await prisma.specialization.create({
      data: {
        industryId: finance.id,
        name: "Quantitative Finance",
        slug: "quantitative-finance",
      },
    });
    const technical = await prisma.interviewType.create({
      data: { name: "Technical", slug: "technical" },
    });
    const behavioral = await prisma.interviewType.create({
      data: { name: "Behavioral", slug: "behavioral" },
    });
    const midLevel = await prisma.experienceLevel.create({
      data: { name: "Mid level", sortOrder: 3 },
    });
    const seniorLevel = await prisma.experienceLevel.create({
      data: { name: "Senior level", sortOrder: 4 },
    });

    return {
      technology,
      finance,
      softwareEngineer,
      financialAnalyst,
      backend,
      frontend,
      quant,
      technical,
      behavioral,
      midLevel,
      seniorLevel,
    };
  }

  type Taxonomy = Awaited<ReturnType<typeof seedTaxonomy>>;

  async function createExpert(
    options: {
      email: string;
      name: string;
      verificationStatus?:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "SUSPENDED";
      publicationStatus?: "UNPUBLISHED" | "PUBLISHED";
      accountStatus?: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
      roleStatus?: "ACTIVE" | "PENDING" | "SUSPENDED";
      headline?: string;
      company?: string;
      introduction?: string;
      industryIds?: string[];
      specializationIds?: string[];
      interviewTypeIds?: string[];
      jobRoleIds?: string[];
      levelIds?: string[];
      languages?: string[];
      experiences?: Prisma.ExpertExperienceCreateWithoutExpertProfileInput[];
    },
    taxonomy: Taxonomy,
  ) {
    const user = await prisma.user.create({
      data: {
        email: options.email,
        passwordHash: "not-used-in-marketplace-tests",
        name: options.name,
        accountStatus: options.accountStatus ?? "ACTIVE",
      },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        role: "EXPERT",
        status: options.roleStatus ?? "ACTIVE",
      },
    });

    return prisma.expertProfile.create({
      data: {
        userId: user.id,
        professionalHeadline: options.headline ?? "Interview coach",
        currentDesignation: "Senior Professional",
        currentCompany: options.company ?? "Independent",
        countryCode: "IN",
        timezone: "Asia/Kolkata",
        introduction:
          options.introduction ??
          "Experienced professional coaching candidates for interviews.",
        yearsExperience: 8,
        verificationStatus: options.verificationStatus ?? "APPROVED",
        publicationStatus: options.publicationStatus ?? "PUBLISHED",
        industries: {
          create: (options.industryIds ?? [taxonomy.technology.id]).map(
            (industryId) => ({ industryId }),
          ),
        },
        specializations: {
          create: (options.specializationIds ?? [taxonomy.backend.id]).map(
            (specializationId) => ({ specializationId }),
          ),
        },
        interviewTypes: {
          create: (options.interviewTypeIds ?? [taxonomy.technical.id]).map(
            (interviewTypeId) => ({ interviewTypeId }),
          ),
        },
        jobRoles: {
          create: (options.jobRoleIds ?? [taxonomy.softwareEngineer.id]).map(
            (jobRoleId) => ({ jobRoleId }),
          ),
        },
        candidateLevels: {
          create: (options.levelIds ?? [taxonomy.midLevel.id]).map(
            (experienceLevelId) => ({ experienceLevelId }),
          ),
        },
        languages: {
          create: (options.languages ?? ["en"]).map((languageCode) => ({
            languageCode,
          })),
        },
        experiences: {
          create: options.experiences ?? [
            {
              company: "Acme Technologies",
              designation: "Staff Engineer",
              startDate: new Date("2020-01-01T00:00:00.000Z"),
              description: "Built and reviewed distributed systems.",
            },
          ],
        },
      },
    });
  }

  async function seedPublicExperts(taxonomy: Taxonomy) {
    const backendExpert = await createExpert(
      {
        email: "aarav@example.com",
        name: "Aarav Sharma",
        headline: "Senior backend engineer and system design coach",
        company: "Acme Technologies",
        industryIds: [taxonomy.technology.id],
        specializationIds: [taxonomy.backend.id],
        interviewTypeIds: [taxonomy.technical.id],
        jobRoleIds: [taxonomy.softwareEngineer.id],
        levelIds: [taxonomy.midLevel.id],
        languages: ["en", "hi"],
      },
      taxonomy,
    );

    const financeExpert = await createExpert(
      {
        email: "bianca@example.com",
        name: "Bianca Lee",
        headline: "Finance interview coach for analysts",
        company: "Northwind Capital",
        industryIds: [taxonomy.finance.id],
        specializationIds: [taxonomy.quant.id],
        interviewTypeIds: [taxonomy.behavioral.id],
        jobRoleIds: [taxonomy.financialAnalyst.id],
        levelIds: [taxonomy.seniorLevel.id],
        languages: ["en"],
      },
      taxonomy,
    );

    const frontendExpert = await createExpert(
      {
        email: "chen@example.com",
        name: "Chen Wei",
        headline: "Frontend engineering interviewer",
        company: "Pixel Labs",
        industryIds: [taxonomy.technology.id],
        specializationIds: [taxonomy.frontend.id],
        interviewTypeIds: [taxonomy.technical.id],
        jobRoleIds: [taxonomy.softwareEngineer.id],
        levelIds: [taxonomy.midLevel.id],
        languages: ["zh"],
      },
      taxonomy,
    );

    return { backendExpert, financeExpert, frontendExpert };
  }

  it("publicly lists only approved, published, active experts", async () => {
    const taxonomy = await seedTaxonomy();
    const { backendExpert } = await seedPublicExperts(taxonomy);

    await Promise.all([
      createExpert(
        {
          email: "draft@example.com",
          name: "Draft Expert",
          verificationStatus: "DRAFT",
          publicationStatus: "UNPUBLISHED",
        },
        taxonomy,
      ),
      createExpert(
        {
          email: "unpublished@example.com",
          name: "Unpublished Expert",
          verificationStatus: "APPROVED",
          publicationStatus: "UNPUBLISHED",
        },
        taxonomy,
      ),
      createExpert(
        {
          email: "suspended@example.com",
          name: "Suspended Expert",
          verificationStatus: "SUSPENDED",
          publicationStatus: "UNPUBLISHED",
        },
        taxonomy,
      ),
      createExpert(
        {
          email: "suspended-account@example.com",
          name: "Suspended Account",
          accountStatus: "SUSPENDED",
        },
        taxonomy,
      ),
      createExpert(
        {
          email: "pending-role@example.com",
          name: "Pending Role Expert",
          roleStatus: "PENDING",
        },
        taxonomy,
      ),
    ]);

    const response = await request(app.getHttpServer()).get("/api/v1/experts");

    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(3);
    expect(
      response.body.experts.map((expert: { user: { name: string } }) => {
        return expert.user.name;
      }),
    ).toEqual(
      expect.arrayContaining(["Aarav Sharma", "Bianca Lee", "Chen Wei"]),
    );
    expect(response.body.experts).toHaveLength(3);

    const listed = response.body.experts.find(
      (expert: { id: string }) => expert.id === backendExpert.id,
    );
    expect(listed.user).toEqual({ name: "Aarav Sharma", avatarUrl: null });
    expect(listed.user).not.toHaveProperty("email");
    expect(listed).not.toHaveProperty("linkedinUrl");
  });

  it("applies server-backed filters, search, and pagination", async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublicExperts(taxonomy);

    const byIndustry = await request(app.getHttpServer()).get(
      `/api/v1/experts?industryId=${taxonomy.finance.id}`,
    );
    expect(byIndustry.status).toBe(200);
    expect(byIndustry.body.experts).toHaveLength(1);
    expect(byIndustry.body.experts[0].user.name).toBe("Bianca Lee");

    const bySpecialization = await request(app.getHttpServer()).get(
      `/api/v1/experts?specializationId=${taxonomy.backend.id}`,
    );
    expect(bySpecialization.body.experts).toHaveLength(1);
    expect(bySpecialization.body.experts[0].user.name).toBe("Aarav Sharma");

    const byInterviewType = await request(app.getHttpServer()).get(
      `/api/v1/experts?interviewTypeId=${taxonomy.technical.id}`,
    );
    expect(byInterviewType.body.experts).toHaveLength(2);

    const byJobRole = await request(app.getHttpServer()).get(
      `/api/v1/experts?jobRoleId=${taxonomy.financialAnalyst.id}`,
    );
    expect(byJobRole.body.experts).toHaveLength(1);

    const byLevel = await request(app.getHttpServer()).get(
      `/api/v1/experts?levelId=${taxonomy.seniorLevel.id}`,
    );
    expect(byLevel.body.experts).toHaveLength(1);
    expect(byLevel.body.experts[0].user.name).toBe("Bianca Lee");

    const byLanguage = await request(app.getHttpServer()).get(
      "/api/v1/experts?language=ZH",
    );
    expect(byLanguage.body.experts).toHaveLength(1);
    expect(byLanguage.body.experts[0].user.name).toBe("Chen Wei");

    const byCompany = await request(app.getHttpServer()).get(
      "/api/v1/experts?q=acme",
    );
    expect(byCompany.body.experts).toHaveLength(1);
    expect(byCompany.body.experts[0].user.name).toBe("Aarav Sharma");

    const byName = await request(app.getHttpServer()).get(
      "/api/v1/experts?q=BIANCA",
    );
    expect(byName.body.experts).toHaveLength(1);

    const combinedMismatch = await request(app.getHttpServer()).get(
      `/api/v1/experts?q=acme&industryId=${taxonomy.finance.id}`,
    );
    expect(combinedMismatch.body.experts).toHaveLength(0);

    const firstPage = await request(app.getHttpServer()).get(
      "/api/v1/experts?page=1&limit=2",
    );
    expect(firstPage.body.experts).toHaveLength(2);
    expect(firstPage.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const secondPage = await request(app.getHttpServer()).get(
      "/api/v1/experts?page=2&limit=2",
    );
    expect(secondPage.body.experts).toHaveLength(1);

    const invalidLimit = await request(app.getHttpServer()).get(
      "/api/v1/experts?limit=50",
    );
    expect(invalidLimit.status).toBe(400);
    expect(invalidLimit.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns filter options used by publicly available experts only", async () => {
    const taxonomy = await seedTaxonomy();
    await seedPublicExperts(taxonomy);

    const rust = await prisma.specialization.create({
      data: {
        industryId: taxonomy.technology.id,
        name: "Rust Systems",
        slug: "rust-systems",
      },
    });
    const systemDesign = await prisma.interviewType.create({
      data: { name: "System design", slug: "system-design" },
    });
    const hidden = await createExpert(
      {
        email: "hidden@example.com",
        name: "Hidden Expert",
        verificationStatus: "SUBMITTED",
        publicationStatus: "UNPUBLISHED",
        specializationIds: [rust.id],
        interviewTypeIds: [systemDesign.id],
        languages: ["de"],
      },
      taxonomy,
    );
    expect(hidden).toBeTruthy();

    const response = await request(app.getHttpServer()).get(
      "/api/v1/experts/filters",
    );

    expect(response.status).toBe(200);
    expect(
      response.body.industries.map((item: { slug: string }) => item.slug),
    ).toEqual(expect.arrayContaining(["technology", "finance"]));
    expect(
      response.body.specializations.map((item: { slug: string }) => item.slug),
    ).not.toContain("rust-systems");
    expect(
      response.body.interviewTypes.map((item: { slug: string }) => item.slug),
    ).toEqual(["behavioral", "technical"]);
    expect(
      response.body.jobRoles.map((item: { slug: string }) => item.slug),
    ).toEqual(
      expect.arrayContaining(["software-engineer", "financial-analyst"]),
    );
    expect(
      response.body.languages.map((item: { code: string }) => item.code),
    ).toEqual(["en", "hi", "zh"]);
    expect(response.body.languages[0].name).toBe("English");
  });

  it("serves a public expert profile and hides unavailable profiles", async () => {
    const taxonomy = await seedTaxonomy();
    const { backendExpert } = await seedPublicExperts(taxonomy);

    const response = await request(app.getHttpServer()).get(
      `/api/v1/experts/${backendExpert.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.expert.user.name).toBe("Aarav Sharma");
    expect(response.body.expert.user).not.toHaveProperty("email");
    expect(response.body.expert).not.toHaveProperty("linkedinUrl");
    expect(response.body.expert.introduction).toContain("Experienced");
    expect(response.body.expert.experiences).toHaveLength(1);
    expect(response.body.expert.experiences[0].company).toBe(
      "Acme Technologies",
    );
    expect(response.body.expert.languages).toEqual(["en", "hi"]);

    const unavailable = await createExpert(
      {
        email: "unavailable@example.com",
        name: "Unavailable Expert",
        verificationStatus: "APPROVED",
        publicationStatus: "UNPUBLISHED",
      },
      taxonomy,
    );

    const hidden = await request(app.getHttpServer()).get(
      `/api/v1/experts/${unavailable.id}`,
    );
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe("EXPERT_NOT_FOUND");

    const missing = await request(app.getHttpServer()).get(
      "/api/v1/experts/00000000-0000-4000-8000-000000000000",
    );
    expect(missing.status).toBe(404);

    const invalidId = await request(app.getHttpServer()).get(
      "/api/v1/experts/not-a-uuid",
    );
    expect(invalidId.status).toBe(400);
  });
});
