import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma, Role } from "@prisma/client";

import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import type { PublicUser } from "../auth/auth.types";
import { toPublicUser } from "../users/user.mapper";
import { AuditService } from "./audit.service";
import type { ListAuditLogsQuery } from "./admin.schemas";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async grantRole(
    actor: PublicUser,
    targetUserId: string,
    role: Extract<Role, "ADMIN" | "EXPERT">,
  ): Promise<PublicUser> {
    if (actor.id === targetUserId && role === "ADMIN") {
      throw new AppException(
        "SELF_ROLE_ASSIGNMENT",
        "You cannot grant yourself administrator access.",
        HttpStatus.FORBIDDEN,
      );
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!target) {
      throw new AppException(
        "USER_NOT_FOUND",
        "The requested user does not exist.",
        HttpStatus.NOT_FOUND,
      );
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_role: { userId: targetUserId, role } },
        update: { status: "ACTIVE" },
        create: { userId: targetUserId, role },
      });

      const saved = await tx.user.findUniqueOrThrow({
        where: { id: targetUserId },
        include: { roles: true },
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: "USER_ROLE_GRANTED",
        entityType: "USER",
        entityId: targetUserId,
        afterState: { role },
      });

      return saved;
    });

    return toPublicUser(user);
  }

  async listAuditLogs(query: ListAuditLogsQuery) {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.action) {
      where.action = { contains: query.action, mode: "insensitive" };
    }

    if (query.entityType) {
      where.entityType = { contains: query.entityType, mode: "insensitive" };
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.actorId) {
      where.actorUserId = query.actorId;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    return {
      logs: logs.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeState: entry.beforeState,
        afterState: entry.afterState,
        actor: entry.actor,
        createdAt: entry.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }
}
