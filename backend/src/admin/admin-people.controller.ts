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

import type { PublicUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminPeopleService } from "./admin-people.service";
import {
  adminReasonSchema,
  listCandidatesQuerySchema,
  type AdminReasonInput,
  type ListCandidatesQuery,
} from "./admin.schemas";

@Controller("admin/candidates")
@Roles("ADMIN")
export class AdminPeopleController {
  constructor(private readonly people: AdminPeopleService) {}

  @Get()
  listCandidates(
    @Query(new ZodValidationPipe(listCandidatesQuerySchema))
    query: ListCandidatesQuery,
  ) {
    return this.people.listCandidates(query);
  }

  @Get(":userId")
  getCandidate(@Param("userId", new ParseUUIDPipe()) userId: string) {
    return this.people.getCandidate(userId);
  }

  @Post(":userId/suspend")
  @HttpCode(200)
  suspend(
    @CurrentUser() actor: PublicUser,
    @Param("userId", new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(adminReasonSchema)) input: AdminReasonInput,
  ) {
    return this.people.suspend(actor, userId, input.reason);
  }

  @Post(":userId/reactivate")
  @HttpCode(200)
  reactivate(
    @CurrentUser() actor: PublicUser,
    @Param("userId", new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(adminReasonSchema)) input: AdminReasonInput,
  ) {
    return this.people.reactivate(actor, userId, input.reason);
  }
}
