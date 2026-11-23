import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

type AuditClient = Prisma.TransactionClient | PrismaService;

export type AuditInput = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeState?: Prisma.InputJsonValue | null;
  afterState?: Prisma.InputJsonValue | null;
  requestId?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(client: AuditClient, input: AuditInput) {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      requestId: input.requestId ?? null,
    };

    if (input.beforeState !== undefined) {
      data.beforeState =
        input.beforeState === null ? Prisma.JsonNull : input.beforeState;
    }

    if (input.afterState !== undefined) {
      data.afterState =
        input.afterState === null ? Prisma.JsonNull : input.afterState;
    }

    return client.auditLog.create({ data });
  }
}
