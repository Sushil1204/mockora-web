import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { publiclyAvailableExpertWhere } from "./expert-eligibility";
import type { ListExpertsQuery } from "./marketplace.schemas";
import {
  publicExpertCardInclude,
  publicExpertProfileInclude,
  toLanguageName,
  toPublicExpertCard,
  toPublicExpertProfile,
} from "./marketplace.mapper";

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async listExperts(query: ListExpertsQuery) {
    const where = this.buildWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [total, experts] = await Promise.all([
      this.prisma.expertProfile.count({ where }),
      this.prisma.expertProfile.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        include: publicExpertCardInclude,
      }),
    ]);

    return {
      experts: experts.map(toPublicExpertCard),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getExpert(expertProfileId: string) {
    const [expert, reviewStats, reviews] = await Promise.all([
      this.prisma.expertProfile.findFirst({
        where: {
          AND: [publiclyAvailableExpertWhere, { id: expertProfileId }],
        },
        include: publicExpertProfileInclude,
      }),
      this.prisma.review.aggregate({
        where: { expertProfileId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.review.findMany({
        where: { expertProfileId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, rating: true, comment: true, createdAt: true },
      }),
    ]);

    if (!expert) {
      throw new AppException(
        "EXPERT_NOT_FOUND",
        "The requested expert profile does not exist or is not available.",
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      expert: {
        ...toPublicExpertProfile(expert),
        reviews: {
          averageRating:
            reviewStats._avg.rating === null
              ? null
              : Math.round(reviewStats._avg.rating * 10) / 10,
          total: reviewStats._count._all,
          items: reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
          })),
        },
      },
    };
  }

  async getFilters() {
    const available = {
      some: { expertProfile: publiclyAvailableExpertWhere },
    };

    const [
      industries,
      specializations,
      interviewTypes,
      jobRoles,
      experienceLevels,
      languages,
    ] = await Promise.all([
      this.prisma.industry.findMany({
        where: { isActive: true, experts: available },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.specialization.findMany({
        where: { isActive: true, experts: available },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, industryId: true },
      }),
      this.prisma.interviewType.findMany({
        where: { isActive: true, experts: available },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.jobRole.findMany({
        where: { isActive: true, experts: available },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, industryId: true },
      }),
      this.prisma.experienceLevel.findMany({
        where: { isActive: true, experts: available },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, sortOrder: true },
      }),
      this.prisma.expertLanguage.groupBy({
        by: ["languageCode"],
        where: { expertProfile: publiclyAvailableExpertWhere },
        orderBy: { languageCode: "asc" },
      }),
    ]);

    return {
      industries,
      specializations,
      interviewTypes,
      jobRoles,
      experienceLevels,
      languages: languages.map((entry) => ({
        code: entry.languageCode,
        name: toLanguageName(entry.languageCode),
      })),
    };
  }

  private buildWhere(query: ListExpertsQuery): Prisma.ExpertProfileWhereInput {
    const conditions: Prisma.ExpertProfileWhereInput[] = [
      publiclyAvailableExpertWhere,
    ];

    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      conditions.push({
        OR: [
          { user: { name: contains } },
          { professionalHeadline: contains },
          { currentDesignation: contains },
          { currentCompany: contains },
        ],
      });
    }

    if (query.industryId) {
      conditions.push({
        industries: { some: { industryId: query.industryId } },
      });
    }

    if (query.specializationId) {
      conditions.push({
        specializations: { some: { specializationId: query.specializationId } },
      });
    }

    if (query.interviewTypeId) {
      conditions.push({
        interviewTypes: { some: { interviewTypeId: query.interviewTypeId } },
      });
    }

    if (query.jobRoleId) {
      conditions.push({ jobRoles: { some: { jobRoleId: query.jobRoleId } } });
    }

    if (query.levelId) {
      conditions.push({
        candidateLevels: { some: { experienceLevelId: query.levelId } },
      });
    }

    if (query.language) {
      conditions.push({
        languages: { some: { languageCode: query.language } },
      });
    }

    return { AND: conditions };
  }
}
