import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

import { Public } from "../common/decorators/public.decorator";
import {
  serializeError,
  structuredLog,
} from "../common/observability/structured-logger";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }

  @Public()
  @Get("ready")
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: string; checks: { database: string } }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", checks: { database: "up" } };
    } catch (error) {
      structuredLog.error("readiness_check_failed", {
        error: serializeError(error),
      });
      response.status(503);
      return { status: "unavailable", checks: { database: "down" } };
    }
  }
}
