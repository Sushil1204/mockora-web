import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@prisma/client";

import { AppException } from "../common/errors/app.exception";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import type { RequestWithUser } from "./auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new AppException(
        "UNAUTHENTICATED",
        "Authentication is required.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const allowed = requiredRoles.some((role) =>
      request.user?.roles.includes(role),
    );

    if (!allowed) {
      throw new AppException(
        "FORBIDDEN",
        "You do not have permission to perform this action.",
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
