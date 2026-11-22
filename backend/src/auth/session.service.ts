import { createHash, randomBytes } from "node:crypto";

import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Role } from "@prisma/client";

import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import type { SessionContext } from "./auth.types";
import { toPublicUser } from "../users/user.mapper";

export type IssuedSession = {
  token: string;
  expiresAt: Date;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private get ttlMs(): number {
    const days = this.config.get<number>("SESSION_TTL_DAYS", 30);
    return days * 24 * 60 * 60 * 1000;
  }

  private buildToken(): { token: string; tokenHash: string; expiresAt: Date } {
    const token = randomBytes(32).toString("base64url");
    return {
      token,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + this.ttlMs),
    };
  }

  async createForUser(userId: string): Promise<IssuedSession> {
    const { token, tokenHash, expiresAt } = this.buildToken();

    await this.prisma.session.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { token, expiresAt };
  }

  async validate(token: string): Promise<SessionContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        user: { include: { roles: true } },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.accountStatus !== "ACTIVE"
    ) {
      return null;
    }

    const user = toPublicUser(session.user);
    const roles: Role[] = user.roles;

    if (roles.length === 0) {
      return null;
    }

    return { sessionId: session.id, user };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async rotate(sessionId: string, userId: string): Promise<IssuedSession> {
    const { token, tokenHash, expiresAt } = this.buildToken();

    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (revoked.count === 0) {
        throw new AppException(
          "SESSION_INVALID",
          "Your session is no longer valid. Please sign in again.",
          HttpStatus.UNAUTHORIZED,
        );
      }

      await transaction.session.create({
        data: { userId, tokenHash, expiresAt },
      });
    });

    return { token, expiresAt };
  }
}
