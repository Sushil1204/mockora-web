import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Response } from "express";

import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "./auth.schemas";
import { AuthService } from "./auth.service";
import type { RequestWithUser } from "./auth.types";
import { RateLimit } from "./rate-limit.decorator";
import { AuthRateLimitGuard } from "./rate-limit.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ name: "auth:register", limit: 30, windowMs: 60 * 60_000 })
  @Post("register")
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(input);
    this.setSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );

    return { user: result.user };
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ name: "auth:login", limit: 10, windowMs: 60_000 })
  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(input);
    this.setSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );

    return { user: result.user };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    if (request.sessionId) {
      await this.auth.logout(request.sessionId);
    }

    response.clearCookie(this.cookieName, this.cookieOptions(undefined));
  }

  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ name: "auth:refresh", limit: 30, windowMs: 60_000 })
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.refresh(
      request.sessionId as string,
      request.user!.id,
    );
    this.setSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );

    return { user: result.user };
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ name: "auth:forgot-password", limit: 5, windowMs: 15 * 60_000 })
  @Post("forgot-password")
  @HttpCode(204)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    input: ForgotPasswordInput,
  ): Promise<void> {
    await this.auth.requestPasswordReset(input);
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ name: "auth:reset-password", limit: 10, windowMs: 15 * 60_000 })
  @Post("reset-password")
  @HttpCode(204)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema))
    input: ResetPasswordInput,
  ): Promise<void> {
    await this.auth.resetPassword(input);
  }

  private setSessionCookie(
    response: Response,
    token: string,
    expiresAt: Date,
  ): void {
    response.cookie(this.cookieName, token, this.cookieOptions(expiresAt));
  }

  private cookieOptions(expires: Date | undefined): CookieOptions {
    const secure =
      this.config.get<string>("NODE_ENV") === "production" ||
      this.config.get<string>("SESSION_COOKIE_SECURE") === "true";

    return {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      expires,
    };
  }

  private get cookieName(): string {
    return this.config.get<string>("SESSION_COOKIE_NAME", "mockoraa_session");
  }
}
