import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import {
  expertProfileInclude,
  toExpertApplication,
  type ExpertProfileWithRelations,
} from "./expert.mapper";
import type { UpdateExpertApplicationInput } from "./expert.schemas";

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

@Injectable()
export class ExpertService {
  constructor(private readonly prisma: PrismaService) {}

  async getApplication(userId: string) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId },
      include: expertProfileInclude,
    });

    return { application: profile ? toExpertApplication(profile) : null };
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId },
      include: expertProfileInclude,
    });

    if (!profile) {
      throw new AppException(
        "EXPERT_PROFILE_NOT_FOUND",
        "No expert application exists for this account.",
        HttpStatus.NOT_FOUND,
      );
    }

    return { application: toExpertApplication(profile) };
  }

  async updateApplication(userId: string, input: UpdateExpertApplicationInput) {
    const existing = await this.prisma.expertProfile.findUnique({
      where: { userId },
      include: { industries: true },
    });

    if (existing && !EDITABLE_STATUSES.includes(existing.verificationStatus)) {
      throw new AppException(
        "APPLICATION_LOCKED",
        "This application can no longer be edited because it has already been submitted.",
        HttpStatus.CONFLICT,
      );
    }

    return this.persist(userId, input, existing);
  }

  async updateProfile(userId: string, input: UpdateExpertApplicationInput) {
    const existing = await this.prisma.expertProfile.findUnique({
      where: { userId },
      include: { industries: true },
    });

    if (!existing) {
      throw new AppException(
        "EXPERT_PROFILE_NOT_FOUND",
        "No expert application exists for this account.",
        HttpStatus.NOT_FOUND,
      );
    }

    if (existing.verificationStatus === "SUSPENDED") {
      throw new AppException(
        "EXPERT_SUSPENDED",
        "This expert profile is suspended. Contact support for assistance.",
        HttpStatus.FORBIDDEN,
      );
    }

    return this.persist(userId, input, existing);
  }

  async submitApplication(userId: string) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { userId },
      include: expertProfileInclude,
    });

    if (!profile) {
      throw new AppException(
        "APPLICATION_NOT_STARTED",
        "Save your application details before submitting.",
        HttpStatus.CONFLICT,
      );
    }

    if (!EDITABLE_STATUSES.includes(profile.verificationStatus)) {
      throw new AppException(
        "APPLICATION_ALREADY_SUBMITTED",
        "This application has already been submitted.",
        HttpStatus.CONFLICT,
      );
    }

    const missing = this.missingSections(profile);

    if (missing.length > 0) {
      throw new AppException(
        "APPLICATION_INCOMPLETE",
        "Complete the required sections before submitting your application.",
        HttpStatus.UNPROCESSABLE_ENTITY,
        { missing },
      );
    }

    const submitted = await this.prisma.$transaction(async (tx) => {
      await tx.expertProfile.update({
        where: { id: profile.id },
        data: {
          verificationStatus: "SUBMITTED",
          publicationStatus: "UNPUBLISHED",
          reviewedById: null,
          reviewedAt: null,
          reviewNotes: null,
        },
      });

      await tx.userRole.upsert({
        where: { userId_role: { userId, role: "EXPERT" } },
        update: {},
        create: { userId, role: "EXPERT", status: "PENDING" },
      });

      return tx.expertProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: expertProfileInclude,
      });
    });

    return { application: toExpertApplication(submitted) };
  }

  private async persist(
    userId: string,
    input: UpdateExpertApplicationInput,
    existing: Prisma.ExpertProfileGetPayload<{
      include: { industries: true };
    }> | null,
  ) {
    await this.validateTaxonomy(
      input,
      existing?.industries.map((e) => e.industryId),
    );

    const profile = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.expertProfile.upsert({
        where: { userId },
        update: {
          ...(input.professionalHeadline !== undefined && {
            professionalHeadline: input.professionalHeadline,
          }),
          ...(input.currentDesignation !== undefined && {
            currentDesignation: input.currentDesignation,
          }),
          ...(input.currentCompany !== undefined && {
            currentCompany: input.currentCompany,
          }),
          ...(input.countryCode !== undefined && {
            countryCode: input.countryCode,
          }),
          ...(input.timezone !== undefined && { timezone: input.timezone }),
          ...(input.linkedinUrl !== undefined && {
            linkedinUrl: input.linkedinUrl,
          }),
          ...(input.introduction !== undefined && {
            introduction: input.introduction,
          }),
          ...(input.yearsExperience !== undefined && {
            yearsExperience: input.yearsExperience,
          }),
          ...(existing?.verificationStatus === "REJECTED" && {
            verificationStatus: "DRAFT" as const,
          }),
        },
        create: {
          userId,
          professionalHeadline: input.professionalHeadline ?? null,
          currentDesignation: input.currentDesignation ?? null,
          currentCompany: input.currentCompany ?? null,
          countryCode: input.countryCode ?? null,
          timezone: input.timezone ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          introduction: input.introduction ?? null,
          yearsExperience: input.yearsExperience ?? null,
        },
      });

      if (input.industryIds !== undefined) {
        await tx.expertIndustry.deleteMany({
          where: { expertProfileId: saved.id },
        });
        await tx.expertIndustry.createMany({
          data: [...new Set(input.industryIds)].map((industryId) => ({
            expertProfileId: saved.id,
            industryId,
          })),
        });
      }

      if (input.specializationIds !== undefined) {
        await tx.expertSpecialization.deleteMany({
          where: { expertProfileId: saved.id },
        });
        await tx.expertSpecialization.createMany({
          data: [...new Set(input.specializationIds)].map(
            (specializationId) => ({
              expertProfileId: saved.id,
              specializationId,
            }),
          ),
        });
      }

      if (input.interviewTypeIds !== undefined) {
        await tx.expertInterviewType.deleteMany({
          where: { expertProfileId: saved.id },
        });
        await tx.expertInterviewType.createMany({
          data: [...new Set(input.interviewTypeIds)].map((interviewTypeId) => ({
            expertProfileId: saved.id,
            interviewTypeId,
          })),
        });
      }

      if (input.jobRoleIds !== undefined) {
        await tx.expertJobRole.deleteMany({
          where: { expertProfileId: saved.id },
        });
        await tx.expertJobRole.createMany({
          data: [...new Set(input.jobRoleIds)].map((jobRoleId) => ({
            expertProfileId: saved.id,
            jobRoleId,
          })),
        });
      }

      if (input.candidateLevelIds !== undefined) {
        await tx.expertCandidateLevel.deleteMany({
          where: { expertProfileId: saved.id },
        });
        await tx.expertCandidateLevel.createMany({
          data: [...new Set(input.candidateLevelIds)].map(
            (experienceLevelId) => ({
              expertProfileId: saved.id,
              experienceLevelId,
            }),
          ),
        });
      }

      if (input.languageCodes !== undefined) {
        await tx.expertLanguage.deleteMany({
          where: { expertProfileId: saved.id },
        });
        await tx.expertLanguage.createMany({
          data: [
            ...new Map(
              input.languageCodes.map((code) => [code.toLowerCase(), code]),
            ).entries(),
          ].map(([languageCode]) => ({
            expertProfileId: saved.id,
            languageCode,
          })),
        });
      }

      if (input.experiences !== undefined) {
        await tx.expertExperience.deleteMany({
          where: { expertProfileId: saved.id },
        });
        await tx.expertExperience.createMany({
          data: input.experiences.map((experience) => ({
            expertProfileId: saved.id,
            company: experience.company,
            designation: experience.designation,
            startDate: new Date(`${experience.startDate}T00:00:00.000Z`),
            endDate: experience.endDate
              ? new Date(`${experience.endDate}T00:00:00.000Z`)
              : null,
            description: experience.description ?? null,
          })),
        });
      }

      return tx.expertProfile.findUniqueOrThrow({
        where: { id: saved.id },
        include: expertProfileInclude,
      });
    });

    return { application: toExpertApplication(profile) };
  }

  private missingSections(profile: ExpertProfileWithRelations): string[] {
    const missing: string[] = [];

    if (!profile.professionalHeadline) missing.push("professionalHeadline");
    if (!profile.currentDesignation) missing.push("currentDesignation");
    if (!profile.currentCompany) missing.push("currentCompany");
    if (!profile.countryCode) missing.push("countryCode");
    if (!profile.timezone) missing.push("timezone");
    if (!profile.linkedinUrl) missing.push("linkedinUrl");
    if (!profile.introduction) missing.push("introduction");
    if (profile.yearsExperience === null) missing.push("yearsExperience");
    if (profile.industries.length === 0) missing.push("industries");
    if (profile.specializations.length === 0) missing.push("specializations");
    if (profile.interviewTypes.length === 0) missing.push("interviewTypes");
    if (profile.jobRoles.length === 0) missing.push("jobRoles");
    if (profile.candidateLevels.length === 0) missing.push("candidateLevels");
    if (profile.languages.length === 0) missing.push("languages");
    if (profile.experiences.length === 0) missing.push("experiences");

    return missing;
  }

  private async validateTaxonomy(
    input: UpdateExpertApplicationInput,
    existingIndustryIds?: string[],
  ): Promise<void> {
    if (input.industryIds !== undefined) {
      const ids = [...new Set(input.industryIds)];
      const count = await this.prisma.industry.count({
        where: { id: { in: ids }, isActive: true },
      });

      if (count !== ids.length) {
        throw this.invalidTaxonomy("industryIds");
      }
    }

    const industryIds = input.industryIds
      ? [...new Set(input.industryIds)]
      : (existingIndustryIds ?? []);

    if (input.specializationIds !== undefined) {
      const ids = [...new Set(input.specializationIds)];
      const specializations = await this.prisma.specialization.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, industryId: true },
      });

      if (
        specializations.length !== ids.length ||
        (industryIds.length > 0 &&
          specializations.some(
            (specialization) =>
              !industryIds.includes(specialization.industryId),
          ))
      ) {
        throw this.invalidTaxonomy("specializationIds");
      }
    }

    if (input.jobRoleIds !== undefined) {
      const ids = [...new Set(input.jobRoleIds)];
      const roles = await this.prisma.jobRole.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, industryId: true },
      });

      if (
        roles.length !== ids.length ||
        (industryIds.length > 0 &&
          roles.some((role) => !industryIds.includes(role.industryId)))
      ) {
        throw this.invalidTaxonomy("jobRoleIds");
      }
    }

    if (input.interviewTypeIds !== undefined) {
      const ids = [...new Set(input.interviewTypeIds)];
      const count = await this.prisma.interviewType.count({
        where: { id: { in: ids }, isActive: true },
      });

      if (count !== ids.length) {
        throw this.invalidTaxonomy("interviewTypeIds");
      }
    }

    if (input.candidateLevelIds !== undefined) {
      const ids = [...new Set(input.candidateLevelIds)];
      const count = await this.prisma.experienceLevel.count({
        where: { id: { in: ids }, isActive: true },
      });

      if (count !== ids.length) {
        throw this.invalidTaxonomy("candidateLevelIds");
      }
    }
  }

  private invalidTaxonomy(field: string): AppException {
    return new AppException(
      "INVALID_TAXONOMY",
      "The selected option is not available. Refresh the page and try again.",
      HttpStatus.UNPROCESSABLE_ENTITY,
      { field },
    );
  }
}
