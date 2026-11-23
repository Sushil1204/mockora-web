import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { PublicUser } from "../auth/auth.types";
import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import type { ListCandidatesQuery } from "./admin.schemas";

const candidateSummaryInclude = {
  roles: { select: { role: true, status: true } },
  candidateProfile: {
    include: {
      industry: { select: { name: true } },
      currentRole: { select: { name: true } },
      targetRole: { select: { name: true } },
      targetLevel: { select: { name: true } },
    },
  },
} satisfies Prisma.UserInclude;

type CandidateRecord = Prisma.UserGetPayload<{
  include: typeof candidateSummaryInclude;
}>;

@Injectable()
export class AdminPeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listCandidates(query: ListCandidatesQuery) {
    const where: Prisma.UserWhereInput = {
      roles: { some: { role: "CANDIDATE" } },
    };

    if (query.status) {
      where.accountStatus = query.status;
    }

    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      where.OR = [{ name: contains }, { email: contains }];
    }

    const [total, candidates] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: candidateSummaryInclude,
      }),
    ]);

    return {
      candidates: candidates.map(toCandidateSummary),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  async getCandidate(userId: string) {
    const candidate = await this.prisma.user.findFirst({
      where: { id: userId, roles: { some: { role: "CANDIDATE" } } },
      include: {
        ...candidateSummaryInclude,
        candidateBookings: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            startsAt: true,
            createdAt: true,
            priceAmount: true,
            currency: true,
            expertProfile: {
              select: { user: { select: { name: true } } },
            },
          },
        },
        candidateReviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            expertProfile: {
              select: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!candidate) {
      throw this.candidateNotFound();
    }

    return {
      candidate: {
        ...toCandidateSummary(candidate),
        recentBookings: candidate.candidateBookings.map((booking) => ({
          id: booking.id,
          status: booking.status,
          startsAt: booking.startsAt.toISOString(),
          createdAt: booking.createdAt.toISOString(),
          priceAmount: booking.priceAmount,
          currency: booking.currency,
          expertName: booking.expertProfile.user.name,
        })),
        recentReviews: candidate.candidateReviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
          expertName: review.expertProfile.user.name,
        })),
      },
    };
  }

  async suspend(actor: PublicUser, userId: string, reason: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findFirst({
        where: { id: userId, roles: { some: { role: "CANDIDATE" } } },
        include: { roles: true },
      });

      if (!target) {
        throw this.candidateNotFound();
      }

      if (target.roles.some((role) => role.role === "ADMIN")) {
        throw new AppException(
          "ADMIN_ACCOUNT_PROTECTED",
          "Administrator accounts cannot be suspended from candidate management.",
          HttpStatus.FORBIDDEN,
        );
      }

      if (target.accountStatus === "SUSPENDED") {
        throw new AppException(
          "CANDIDATE_ALREADY_SUSPENDED",
          "This candidate account is already suspended.",
          HttpStatus.CONFLICT,
        );
      }

      const saved = await tx.user.update({
        where: { id: target.id },
        data: { accountStatus: "SUSPENDED" },
        include: candidateSummaryInclude,
      });

      await tx.session.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: "CANDIDATE_SUSPENDED",
        entityType: "USER",
        entityId: target.id,
        beforeState: { accountStatus: target.accountStatus },
        afterState: { accountStatus: saved.accountStatus, reason },
      });

      return saved;
    });

    return { candidate: toCandidateSummary(updated) };
  }

  async reactivate(actor: PublicUser, userId: string, reason: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findFirst({
        where: { id: userId, roles: { some: { role: "CANDIDATE" } } },
        include: { roles: true },
      });

      if (!target) {
        throw this.candidateNotFound();
      }

      if (target.accountStatus !== "SUSPENDED") {
        throw new AppException(
          "CANDIDATE_NOT_SUSPENDED",
          "This candidate account is not suspended.",
          HttpStatus.CONFLICT,
        );
      }

      const saved = await tx.user.update({
        where: { id: target.id },
        data: { accountStatus: "ACTIVE" },
        include: candidateSummaryInclude,
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: "CANDIDATE_REACTIVATED",
        entityType: "USER",
        entityId: target.id,
        beforeState: { accountStatus: target.accountStatus },
        afterState: { accountStatus: saved.accountStatus, reason },
      });

      return saved;
    });

    return { candidate: toCandidateSummary(updated) };
  }

  private candidateNotFound() {
    return new AppException(
      "CANDIDATE_NOT_FOUND",
      "The requested candidate does not exist.",
      HttpStatus.NOT_FOUND,
    );
  }
}

function toCandidateSummary(candidate: CandidateRecord) {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    avatarUrl: candidate.avatarUrl,
    countryCode: candidate.countryCode,
    accountStatus: candidate.accountStatus,
    roles: candidate.roles.map((role) => ({
      role: role.role,
      status: role.status,
    })),
    createdAt: candidate.createdAt.toISOString(),
    profile: candidate.candidateProfile
      ? {
          careerStage: candidate.candidateProfile.careerStage,
          yearsExperience: candidate.candidateProfile.yearsExperience,
          completionState: candidate.candidateProfile.profileCompletionState,
          industry: candidate.candidateProfile.industry?.name ?? null,
          currentRole: candidate.candidateProfile.currentRole?.name ?? null,
          targetRole: candidate.candidateProfile.targetRole?.name ?? null,
          targetLevel: candidate.candidateProfile.targetLevel?.name ?? null,
        }
      : null,
  };
}

function pagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
