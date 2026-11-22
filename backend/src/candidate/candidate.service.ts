import { HttpStatus, Injectable } from "@nestjs/common";

import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import {
  candidateProfileInclude,
  toCandidateProfile,
} from "./candidate.mapper";
import type { UpdateCandidateProfileInput } from "./candidate.schemas";

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: candidateProfileInclude,
    });

    return { profile: profile ? toCandidateProfile(profile) : null };
  }

  async updateProfile(userId: string, input: UpdateCandidateProfileInput) {
    const existing = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    const industryId = input.industryId ?? existing?.industryId ?? null;
    const currentRoleId =
      input.currentRoleId ?? existing?.currentRoleId ?? null;
    const targetRoleId = input.targetRoleId ?? existing?.targetRoleId ?? null;
    const targetLevelId =
      input.targetLevelId ?? existing?.targetLevelId ?? null;
    const yearsExperience =
      input.yearsExperience ?? existing?.yearsExperience ?? null;
    const careerStage = input.careerStage ?? existing?.careerStage ?? null;
    const goals = [
      ...new Set(input.goals ?? existing?.goals ?? []),
    ] as string[];

    await this.assertIndustry(industryId);
    await this.assertRoles(industryId, [currentRoleId, targetRoleId]);
    await this.assertExperienceLevel(targetLevelId);

    const complete = Boolean(
      careerStage &&
      industryId &&
      currentRoleId &&
      targetRoleId &&
      yearsExperience !== null &&
      targetLevelId &&
      goals.length > 0,
    );

    const profile = await this.prisma.candidateProfile.upsert({
      where: { userId },
      update: {
        ...(input.careerStage !== undefined && {
          careerStage: input.careerStage,
        }),
        ...(input.industryId !== undefined && {
          industryId: input.industryId,
        }),
        ...(input.currentRoleId !== undefined && {
          currentRoleId: input.currentRoleId,
        }),
        ...(input.targetRoleId !== undefined && {
          targetRoleId: input.targetRoleId,
        }),
        ...(input.yearsExperience !== undefined && {
          yearsExperience: input.yearsExperience,
        }),
        ...(input.targetLevelId !== undefined && {
          targetLevelId: input.targetLevelId,
        }),
        ...(input.goals !== undefined && { goals }),
        profileCompletionState: complete ? "COMPLETE" : "INCOMPLETE",
      },
      create: {
        userId,
        careerStage: input.careerStage ?? null,
        industryId: input.industryId ?? null,
        currentRoleId: input.currentRoleId ?? null,
        targetRoleId: input.targetRoleId ?? null,
        yearsExperience: input.yearsExperience ?? null,
        targetLevelId: input.targetLevelId ?? null,
        goals,
        profileCompletionState: complete ? "COMPLETE" : "INCOMPLETE",
      },
      include: candidateProfileInclude,
    });

    return { profile: toCandidateProfile(profile) };
  }

  private async assertIndustry(industryId: string | null): Promise<void> {
    if (!industryId) {
      return;
    }

    const industry = await this.prisma.industry.findFirst({
      where: { id: industryId, isActive: true },
      select: { id: true },
    });

    if (!industry) {
      throw this.invalidTaxonomy("industryId");
    }
  }

  private async assertRoles(
    industryId: string | null,
    roleIds: Array<string | null>,
  ): Promise<void> {
    const ids = [...new Set(roleIds.filter((id): id is string => Boolean(id)))];

    if (ids.length === 0) {
      return;
    }

    const roles = await this.prisma.jobRole.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, industryId: true },
    });

    if (
      roles.length !== ids.length ||
      roles.some((role) => role.industryId !== industryId)
    ) {
      throw this.invalidTaxonomy("currentRoleId");
    }
  }

  private async assertExperienceLevel(levelId: string | null): Promise<void> {
    if (!levelId) {
      return;
    }

    const level = await this.prisma.experienceLevel.findFirst({
      where: { id: levelId, isActive: true },
      select: { id: true },
    });

    if (!level) {
      throw this.invalidTaxonomy("targetLevelId");
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
