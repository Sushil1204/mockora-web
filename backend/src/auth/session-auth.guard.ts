import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";

import { AppException } from "../common/errors/app.exception";
import { IS_PUBLIC_KEY } from "../common/decorators/public.decorator";
import type { RequestWithUser } from "./auth.types";
import { SessionService } from "./session.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new AppException(
        "UNAUTHENTICATED",
        "Authentication is required.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const session = await this.sessions.validate(token);

    if (!session) {
      throw new AppException(
        "UNAUTHENTICATED",
        "Your session is invalid or has expired. Please sign in again.",
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.user = session.user;
    request.sessionId = session.sessionId;

    return true;
  }

  private extractToken(request: RequestWithUser): string | undefined {
    const authorization = request.headers.authorization;

    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length).trim();
    }

    const cookieName = this.config.get<string>(
      "SESSION_COOKIE_NAME",
      "mockoraa_session",
    );

    return request.cookies?.[cookieName] as string | undefined;
  }
}
