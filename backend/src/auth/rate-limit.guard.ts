import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";

import { AppException } from "../common/errors/app.exception";
import { RATE_LIMIT_KEY, type RateLimitOptions } from "./rate-limit.decorator";

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const now = Date.now();
    const key = `${options.name}:${request.ip ?? "unknown"}`;

    this.pruneExpired(now);

    let bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > options.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      );
      response.setHeader("Retry-After", String(retryAfterSeconds));
      throw new AppException(
        "RATE_LIMITED",
        "Too many authentication attempts. Please wait and try again.",
        HttpStatus.TOO_MANY_REQUESTS,
        { retryAfterSeconds },
      );
    }

    return true;
  }

  private pruneExpired(now: number): void {
    if (this.buckets.size < 10_000) {
      return;
    }

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
