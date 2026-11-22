import { createHash, randomBytes } from "node:crypto";

import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";

import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import type { PublicUser } from "./auth.types";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "./auth.schemas";
import { SessionService } from "./session.service";
import { toPublicUser } from "../users/user.mapper";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async register(input: RegisterInput): Promise<{
    user: PublicUser;
    session: { token: string; expiresAt: Date };
  }> {
    const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          roles: { create: { role: "CANDIDATE" } },
        },
        include: { roles: true },
      });

      const session = await this.sessions.createForUser(user.id);

      return { user: toPublicUser(user), session };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppException(
          "EMAIL_TAKEN",
          "An account with this email already exists.",
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  async login(input: LoginInput): Promise<{
    user: PublicUser;
    session: { token: string; expiresAt: Date };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: true },
    });

    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new AppException(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.accountStatus !== "ACTIVE") {
      throw new AppException(
        "ACCOUNT_UNAVAILABLE",
        "This account is not available. Contact support for help.",
        HttpStatus.FORBIDDEN,
      );
    }

    const session = await this.sessions.createForUser(user.id);

    return { user: toPublicUser(user), session };
  }

  async refresh(
    sessionId: string,
    userId: string,
  ): Promise<{
    user: PublicUser;
    session: { token: string; expiresAt: Date };
  }> {
    const session = await this.sessions.rotate(sessionId, userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new AppException(
        "UNAUTHENTICATED",
        "Your session is no longer valid. Please sign in again.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    return { user: toPublicUser(user), session };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
  }

  async requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      return;
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
    ]);

    // Delivery is intentionally not logged or returned. Email delivery arrives
    // with the notification provider; the token stays server-side until then.
    this.logger.log("Password reset requested for an existing account.");
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
      throw new AppException(
        "INVALID_RESET_TOKEN",
        "This password reset link is invalid or has expired.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: input,
      include: { roles: true },
    });

    return toPublicUser(user);
  }
}
