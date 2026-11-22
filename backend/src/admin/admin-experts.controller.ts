import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { PublicUser } from "../auth/auth.types";
import {
  listApplicationsQuerySchema,
  reviewApplicationSchema,
  type ListApplicationsQuery,
  type ReviewApplicationInput,
} from "./admin-experts.schemas";
import { AdminExpertsService } from "./admin-experts.service";

@Controller("admin/experts")
@Roles("ADMIN")
export class AdminExpertsController {
  constructor(private readonly experts: AdminExpertsService) {}

  @Get("applications")
  listApplications(
    @Query(new ZodValidationPipe(listApplicationsQuerySchema))
    query: ListApplicationsQuery,
  ) {
    return this.experts.listApplications(query);
  }

  @Post(":expertProfileId/approve")
  @HttpCode(200)
  approve(
    @CurrentUser() actor: PublicUser,
    @Param("expertProfileId", new ParseUUIDPipe()) expertProfileId: string,
    @Body(new ZodValidationPipe(reviewApplicationSchema))
    input: ReviewApplicationInput,
  ) {
    return this.experts.approve(actor, expertProfileId, input.notes);
  }

  @Post(":expertProfileId/reject")
  @HttpCode(200)
  reject(
    @CurrentUser() actor: PublicUser,
    @Param("expertProfileId", new ParseUUIDPipe()) expertProfileId: string,
    @Body(new ZodValidationPipe(reviewApplicationSchema))
    input: ReviewApplicationInput,
  ) {
    return this.experts.reject(actor, expertProfileId, input.notes);
  }

  @Post(":expertProfileId/suspend")
  @HttpCode(200)
  suspend(
    @CurrentUser() actor: PublicUser,
    @Param("expertProfileId", new ParseUUIDPipe()) expertProfileId: string,
    @Body(new ZodValidationPipe(reviewApplicationSchema))
    input: ReviewApplicationInput,
  ) {
    return this.experts.suspend(actor, expertProfileId, input.notes);
  }
}
