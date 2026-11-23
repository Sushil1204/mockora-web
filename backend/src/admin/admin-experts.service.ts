import { HttpStatus, Injectable } from "@nestjs/common";

import type { PublicUser } from "../auth/auth.types";
import { AppException } from "../common/errors/app.exception";
import {
  expertProfileInclude,
  toExpertApplication,
} from "../expert/expert.mapper";
import { PrismaService } from "../prisma/prisma.service";
import type { ListApplicationsQuery } from "./admin-experts.schemas";
import { AuditService } from "./audit.service";

@Injectable()
export class AdminExpertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listApplications(query: ListApplicationsQuery) {
    const where = {
      ...(query.status ? { verificationStatus: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              {
                user: {
                  name: { contains: query.q, mode: "insensitive" as const },
                },
              },
              {
                user: {
                  email: { contains: query.q, mode: "insensitive" as const },
                },
              },
              {
                professionalHeadline: {
                  contains: query.q,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;

    const [total, applications] = await Promise.all([
      this.prisma.expertProfile.count({ where }),
      this.prisma.expertProfile.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { updatedAt: "desc" },
        include: expertProfileInclude,
      }),
    ]);

    return {
      applications: applications.map(toExpertApplication),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async approve(actor: PublicUser, expertProfileId: string, notes?: string) {
    return this.review(actor, expertProfileId, "APPROVE", notes);
  }

  async reject(actor: PublicUser, expertProfileId: string, notes?: string) {
    return this.review(actor, expertProfileId, "REJECT", notes);
  }

  async suspend(actor: PublicUser, expertProfileId: string, notes?: string) {
    return this.review(actor, expertProfileId, "SUSPEND", notes);
  }

  async reactivate(actor: PublicUser, expertProfileId: string, notes?: string) {
    const profile = await this.prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
    });

    if (!profile) {
      throw new AppException(
        "EXPERT_NOT_FOUND",
        "The requested expert application does not exist.",
        HttpStatus.NOT_FOUND,
      );
    }

    if (profile.verificationStatus !== "SUSPENDED") {
      throw new AppException(
        "INVALID_VERIFICATION_TRANSITION",
        "Only suspended experts can be reactivated.",
        HttpStatus.CONFLICT,
        { currentStatus: profile.verificationStatus },
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.expertProfile.update({
        where: { id: profile.id },
        data: {
          verificationStatus: "APPROVED",
          publicationStatus: "PUBLISHED",
          reviewedById: actor.id,
          reviewedAt: new Date(),
          reviewNotes: notes ?? null,
        },
        include: expertProfileInclude,
      });

      await tx.userRole.upsert({
        where: { userId_role: { userId: profile.userId, role: "EXPERT" } },
        update: { status: "ACTIVE" },
        create: { userId: profile.userId, role: "EXPERT", status: "ACTIVE" },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: "EXPERT_REACTIVATED",
        entityType: "EXPERT_PROFILE",
        entityId: profile.id,
        beforeState: {
          verificationStatus: profile.verificationStatus,
          publicationStatus: profile.publicationStatus,
        },
        afterState: {
          verificationStatus: saved.verificationStatus,
          publicationStatus: saved.publicationStatus,
          notes: notes ?? null,
        },
      });

      return saved;
    });

    return { application: toExpertApplication(updated) };
  }

  private async review(
    actor: PublicUser,
    expertProfileId: string,
    action: "APPROVE" | "REJECT" | "SUSPEND",
    notes?: string,
  ) {
    if (action !== "APPROVE" && !notes) {
      throw new AppException(
        "REVIEW_NOTES_REQUIRED",
        "Provide a reason for this decision so the expert understands what happens next.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const profile = await this.prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
    });

    if (!profile) {
      throw new AppException(
        "EXPERT_NOT_FOUND",
        "The requested expert application does not exist.",
        HttpStatus.NOT_FOUND,
      );
    }

    const reviewable = ["SUBMITTED", "UNDER_REVIEW"];
    const allowed =
      action === "SUSPEND"
        ? profile.verificationStatus === "APPROVED"
        : reviewable.includes(profile.verificationStatus);

    if (!allowed) {
      throw new AppException(
        "INVALID_VERIFICATION_TRANSITION",
        "This application is not in a state that allows that decision.",
        HttpStatus.CONFLICT,
        { currentStatus: profile.verificationStatus },
      );
    }

    const reviewedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.expertProfile.update({
        where: { id: profile.id },
        data: {
          verificationStatus:
            action === "APPROVE"
              ? "APPROVED"
              : action === "REJECT"
                ? "REJECTED"
                : "SUSPENDED",
          publicationStatus: action === "APPROVE" ? "PUBLISHED" : "UNPUBLISHED",
          reviewedById: actor.id,
          reviewedAt,
          reviewNotes: notes ?? null,
        },
        include: expertProfileInclude,
      });

      await tx.userRole.upsert({
        where: { userId_role: { userId: profile.userId, role: "EXPERT" } },
        update: {
          status:
            action === "APPROVE"
              ? "ACTIVE"
              : action === "REJECT"
                ? "PENDING"
                : "SUSPENDED",
        },
        create: {
          userId: profile.userId,
          role: "EXPERT",
          status: action === "APPROVE" ? "ACTIVE" : "PENDING",
        },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action:
          action === "APPROVE"
            ? "EXPERT_APPROVED"
            : action === "REJECT"
              ? "EXPERT_REJECTED"
              : "EXPERT_SUSPENDED",
        entityType: "EXPERT_PROFILE",
        entityId: profile.id,
        beforeState: {
          verificationStatus: profile.verificationStatus,
          publicationStatus: profile.publicationStatus,
        },
        afterState: {
          verificationStatus: saved.verificationStatus,
          publicationStatus: saved.publicationStatus,
          notes: notes ?? null,
        },
      });

      return saved;
    });

    return { application: toExpertApplication(updated) };
  }
}
