import type { INestApplication } from "@nestjs/common";
import request from "supertest";

import { PrismaService } from "../src/prisma/prisma.service";
import {
  createTestApp,
  DEFAULT_PASSWORD,
  getCookieHeader,
  resetDatabase,
} from "./test-utils";

describe("Candidate and expert onboarding (e2e)", () => {
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

  async function register(email: string, name = "Onboarding Tester") {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: DEFAULT_PASSWORD, name });

    return {
      response,
      cookie: getCookieHeader(response.headers["set-cookie"]),
      userId: response.body.user.id as string,
    };
  }

  async function makeAdmin(userId: string): Promise<void> {
    await prisma.userRole.create({ data: { userId, role: "ADMIN" } });
  }

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
    const seniorEngineer = await prisma.jobRole.create({
      data: {
        industryId: technology.id,
        name: "Senior Software Engineer",
        slug: "senior-software-engineer",
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
    const technical = await prisma.interviewType.create({
      data: { name: "Technical", slug: "technical" },
    });
    const midLevel = await prisma.experienceLevel.create({
      data: { name: "Mid level", sortOrder: 3 },
    });

    return {
      technology,
      finance,
      softwareEngineer,
      seniorEngineer,
      financialAnalyst,
      backend,
      technical,
      midLevel,
    };
  }

  function candidateProfilePayload(
    taxonomy: Awaited<ReturnType<typeof seedTaxonomy>>,
  ) {
    return {
      careerStage: "MID_CAREER",
      industryId: taxonomy.technology.id,
      currentRoleId: taxonomy.softwareEngineer.id,
      targetRoleId: taxonomy.seniorEngineer.id,
      yearsExperience: 5,
      targetLevelId: taxonomy.midLevel.id,
      goals: ["TECHNICAL_KNOWLEDGE", "COMMUNICATION"],
    };
  }

  function expertApplicationPayload(
    taxonomy: Awaited<ReturnType<typeof seedTaxonomy>>,
  ) {
    return {
      professionalHeadline: "Staff engineer and interview coach",
      currentDesignation: "Staff Software Engineer",
      currentCompany: "Acme Technologies",
      countryCode: "in",
      timezone: "Asia/Kolkata",
      linkedinUrl: "https://www.linkedin.com/in/example-engineer",
      introduction:
        "I have spent a decade building backend systems and now coach engineers preparing for senior interviews.",
      yearsExperience: 10,
      industryIds: [taxonomy.technology.id],
      specializationIds: [taxonomy.backend.id],
      interviewTypeIds: [taxonomy.technical.id],
      jobRoleIds: [taxonomy.seniorEngineer.id],
      candidateLevelIds: [taxonomy.midLevel.id],
      languageCodes: ["en", "hi"],
      experiences: [
        {
          company: "Acme Technologies",
          designation: "Staff Software Engineer",
          startDate: "2020-01-01",
          endDate: null,
          description: "Leads platform reliability and mentoring.",
        },
      ],
    };
  }

  it("provides active taxonomy to authenticated users only", async () => {
    const taxonomy = await seedTaxonomy();
    await prisma.jobRole.update({
      where: { id: taxonomy.financialAnalyst.id },
      data: { isActive: false },
    });

    const unauthenticated = await request(app.getHttpServer()).get(
      "/api/v1/taxonomies",
    );
    expect(unauthenticated.status).toBe(401);

    const candidate = await register("taxonomy@example.com");
    const response = await request(app.getHttpServer())
      .get("/api/v1/taxonomies")
      .set("Cookie", candidate.cookie);

    expect(response.status).toBe(200);
    expect(response.body.industries).toHaveLength(2);
    expect(response.body.industries[0].name).toBe("Finance");
    const technology = response.body.industries.find(
      (industry: { slug: string }) => industry.slug === "technology",
    );
    expect(
      technology.jobRoles.map((role: { slug: string }) => role.slug),
    ).not.toContain("financial-analyst");
    expect(response.body.interviewTypes).toHaveLength(1);
    expect(response.body.experienceLevels[0].name).toBe("Mid level");
  });

  it("creates and updates a candidate profile with completion state", async () => {
    const taxonomy = await seedTaxonomy();
    const candidate = await register("candidate-profile@example.com");
    const payload = candidateProfilePayload(taxonomy);

    const created = await request(app.getHttpServer())
      .put("/api/v1/candidate/profile")
      .set("Cookie", candidate.cookie)
      .send(payload);

    expect(created.status).toBe(200);
    expect(created.body.profile.completionState).toBe("COMPLETE");
    expect(created.body.profile.industry.slug).toBe("technology");
    expect(created.body.profile.currentRole.slug).toBe("software-engineer");
    expect(created.body.profile.goals).toEqual([
      "TECHNICAL_KNOWLEDGE",
      "COMMUNICATION",
    ]);

    const partial = await request(app.getHttpServer())
      .put("/api/v1/candidate/profile")
      .set("Cookie", candidate.cookie)
      .send({ yearsExperience: 6 });

    expect(partial.status).toBe(200);
    expect(partial.body.profile.yearsExperience).toBe(6);
    expect(partial.body.profile.completionState).toBe("COMPLETE");

    const fetched = await request(app.getHttpServer())
      .get("/api/v1/candidate/profile")
      .set("Cookie", candidate.cookie);

    expect(fetched.status).toBe(200);
    expect(fetched.body.profile.yearsExperience).toBe(6);

    const mismatch = await request(app.getHttpServer())
      .put("/api/v1/candidate/profile")
      .set("Cookie", candidate.cookie)
      .send({ currentRoleId: taxonomy.financialAnalyst.id });

    expect(mismatch.status).toBe(422);
    expect(mismatch.body.error.code).toBe("INVALID_TAXONOMY");
  });

  it("rejects duplicate preparation goals and invalid years of experience", async () => {
    const taxonomy = await seedTaxonomy();
    const candidate = await register("candidate-validation@example.com");

    const invalidGoals = await request(app.getHttpServer())
      .put("/api/v1/candidate/profile")
      .set("Cookie", candidate.cookie)
      .send({ ...candidateProfilePayload(taxonomy), goals: ["NOT_A_GOAL"] });

    expect(invalidGoals.status).toBe(400);
    expect(invalidGoals.body.error.code).toBe("VALIDATION_ERROR");

    const invalidYears = await request(app.getHttpServer())
      .put("/api/v1/candidate/profile")
      .set("Cookie", candidate.cookie)
      .send({ ...candidateProfilePayload(taxonomy), yearsExperience: 99 });

    expect(invalidYears.status).toBe(400);
    expect(invalidYears.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("saves a draft, blocks incomplete submission, and requires ownership", async () => {
    await seedTaxonomy();
    const candidate = await register("expert-draft@example.com");
    const other = await register("other@example.com");

    const empty = await request(app.getHttpServer())
      .get("/api/v1/expert/application")
      .set("Cookie", candidate.cookie);
    expect(empty.status).toBe(200);
    expect(empty.body.application).toBeNull();

    const draft = await request(app.getHttpServer())
      .patch("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send({ professionalHeadline: "Backend interview coach" });

    expect(draft.status).toBe(200);
    expect(draft.body.application.verificationStatus).toBe("DRAFT");
    expect(draft.body.application.professionalHeadline).toBe(
      "Backend interview coach",
    );

    const incomplete = await request(app.getHttpServer())
      .post("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send({});

    expect(incomplete.status).toBe(422);
    expect(incomplete.body.error.code).toBe("APPLICATION_INCOMPLETE");
    expect(incomplete.body.error.details.missing).toContain("experiences");

    const completelyDifferentDraft = await request(app.getHttpServer())
      .patch("/api/v1/expert/application")
      .set("Cookie", other.cookie)
      .send({ currentCompany: "Other Corp" });

    expect(completelyDifferentDraft.status).toBe(200);

    const candidateView = await request(app.getHttpServer())
      .get("/api/v1/expert/application")
      .set("Cookie", candidate.cookie);

    expect(candidateView.body.application.currentCompany).toBeNull();
  });

  it("prevents clients from setting verification status or capabilities outside their industries", async () => {
    const taxonomy = await seedTaxonomy();
    const candidate = await register("expert-guards@example.com");

    const draft = await request(app.getHttpServer())
      .patch("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send(expertApplicationPayload(taxonomy));

    expect(draft.status).toBe(200);

    const attemptedApproval = await request(app.getHttpServer())
      .patch("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send({
        verificationStatus: "APPROVED",
        publicationStatus: "PUBLISHED",
        professionalHeadline: "Updated headline for review",
      });

    expect(attemptedApproval.status).toBe(200);
    expect(attemptedApproval.body.application.verificationStatus).toBe("DRAFT");
    expect(attemptedApproval.body.application.publicationStatus).toBe(
      "UNPUBLISHED",
    );

    const mismatch = await request(app.getHttpServer())
      .patch("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send({
        jobRoleIds: [taxonomy.financialAnalyst.id],
      });

    expect(mismatch.status).toBe(422);
    expect(mismatch.body.error.code).toBe("INVALID_TAXONOMY");
  });

  it("submits an application without activating the expert role", async () => {
    const taxonomy = await seedTaxonomy();
    const candidate = await register("expert-submit@example.com");

    const draft = await request(app.getHttpServer())
      .patch("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send(expertApplicationPayload(taxonomy));
    expect(draft.status).toBe(200);

    const submitted = await request(app.getHttpServer())
      .post("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send({});

    expect(submitted.status).toBe(200);
    expect(submitted.body.application.verificationStatus).toBe("SUBMITTED");
    expect(submitted.body.application.publicationStatus).toBe("UNPUBLISHED");
    expect(submitted.body.application.countryCode).toBe("IN");
    expect(submitted.body.application.languages).toEqual(["en", "hi"]);

    const me = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", candidate.cookie);

    expect(me.body.user.roles).toEqual(["CANDIDATE"]);

    const lockedEdit = await request(app.getHttpServer())
      .patch("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send({ currentCompany: "Changed While Under Review" });

    expect(lockedEdit.status).toBe(409);
    expect(lockedEdit.body.error.code).toBe("APPLICATION_LOCKED");

    const profile = await request(app.getHttpServer())
      .get("/api/v1/expert/profile")
      .set("Cookie", candidate.cookie);

    expect(profile.status).toBe(403);

    const resubmit = await request(app.getHttpServer())
      .post("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send({});

    expect(resubmit.status).toBe(409);
    expect(resubmit.body.error.code).toBe("APPLICATION_ALREADY_SUBMITTED");
  });

  it("restricts admin review and enforces approval transitions", async () => {
    const taxonomy = await seedTaxonomy();
    const candidate = await register("expert-review@example.com");
    const admin = await register("review-admin@example.com");
    await makeAdmin(admin.userId);

    await request(app.getHttpServer())
      .patch("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send(expertApplicationPayload(taxonomy));
    const submitted = await request(app.getHttpServer())
      .post("/api/v1/expert/application")
      .set("Cookie", candidate.cookie)
      .send({});
    const applicationId = submitted.body.application.id as string;

    const candidateList = await request(app.getHttpServer())
      .get("/api/v1/admin/experts/applications")
      .set("Cookie", candidate.cookie);
    expect(candidateList.status).toBe(403);

    const unauthenticatedList = await request(app.getHttpServer()).get(
      "/api/v1/admin/experts/applications",
    );
    expect(unauthenticatedList.status).toBe(401);

    const list = await request(app.getHttpServer())
      .get("/api/v1/admin/experts/applications?status=SUBMITTED")
      .set("Cookie", admin.cookie);

    expect(list.status).toBe(200);
    expect(list.body.applications).toHaveLength(1);
    expect(list.body.applications[0].id).toBe(applicationId);
    expect(list.body.applications[0].user.email).toBe(
      "expert-review@example.com",
    );
    expect(list.body.pagination.total).toBe(1);

    const missingReason = await request(app.getHttpServer())
      .post(`/api/v1/admin/experts/${applicationId}/reject`)
      .set("Cookie", admin.cookie)
      .send({});

    expect(missingReason.status).toBe(400);
    expect(missingReason.body.error.code).toBe("REVIEW_NOTES_REQUIRED");

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/admin/experts/${applicationId}/approve`)
      .set("Cookie", admin.cookie)
      .send({ notes: "Verified experience and references." });

    expect(approved.status).toBe(200);
    expect(approved.body.application.verificationStatus).toBe("APPROVED");
    expect(approved.body.application.publicationStatus).toBe("PUBLISHED");
    expect(approved.body.application.reviewNotes).toBe(
      "Verified experience and references.",
    );

    const me = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", candidate.cookie);

    expect(me.body.user.roles).toEqual(["CANDIDATE", "EXPERT"]);

    const profile = await request(app.getHttpServer())
      .get("/api/v1/expert/profile")
      .set("Cookie", candidate.cookie);

    expect(profile.status).toBe(200);
    expect(profile.body.application.verificationStatus).toBe("APPROVED");

    const approvedEdit = await request(app.getHttpServer())
      .patch("/api/v1/expert/profile")
      .set("Cookie", candidate.cookie)
      .send({ currentCompany: "New Employer" });

    expect(approvedEdit.status).toBe(200);
    expect(approvedEdit.body.application.currentCompany).toBe("New Employer");
    expect(approvedEdit.body.application.verificationStatus).toBe("APPROVED");

    const reapprove = await request(app.getHttpServer())
      .post(`/api/v1/admin/experts/${applicationId}/approve`)
      .set("Cookie", admin.cookie)
      .send({});

    expect(reapprove.status).toBe(409);
    expect(reapprove.body.error.code).toBe("INVALID_VERIFICATION_TRANSITION");

    const suspended = await request(app.getHttpServer())
      .post(`/api/v1/admin/experts/${applicationId}/suspend`)
      .set("Cookie", admin.cookie)
      .send({ notes: "Repeated scheduling abuse reports." });

    expect(suspended.status).toBe(200);
    expect(suspended.body.application.verificationStatus).toBe("SUSPENDED");
    expect(suspended.body.application.publicationStatus).toBe("UNPUBLISHED");

    const suspendedMe = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Cookie", candidate.cookie);

    expect(suspendedMe.body.user.roles).toEqual(["CANDIDATE"]);

    const suspendedProfile = await request(app.getHttpServer())
      .get("/api/v1/expert/profile")
      .set("Cookie", candidate.cookie);

    expect(suspendedProfile.status).toBe(403);
  });
});
