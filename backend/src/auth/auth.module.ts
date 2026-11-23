import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionAuthGuard } from "./session-auth.guard";
import { SessionService } from "./session.service";
import { RolesGuard } from "./roles.guard";
import { AuthRateLimitGuard } from "./rate-limit.guard";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SessionAuthGuard,
    RolesGuard,
    AuthRateLimitGuard,
  ],
  exports: [AuthService, SessionService, SessionAuthGuard, RolesGuard],
})
export class AuthModule {}
