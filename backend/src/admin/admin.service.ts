import { HttpStatus, Injectable } from "@nestjs/common";
import type { Role } from "@prisma/client";

import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import type { PublicUser } from "../auth/auth.types";
import { toPublicUser } from "../users/user.mapper";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

    await this.prisma.userRole.upsert({
      where: { userId_role: { userId: targetUserId, role } },
      update: { status: "ACTIVE" },
      create: { userId: targetUserId, role },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
      include: { roles: true },
    });

    return toPublicUser(user);
  }
}
