import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { PublicUser } from "../auth/auth.types";
import {
  createAvailabilityExceptionSchema,
  publicAvailabilityQuerySchema,
  replaceAvailabilityRulesSchema,
  type CreateAvailabilityExceptionInput,
  type PublicAvailabilityQuery,
  type ReplaceAvailabilityRulesInput,
} from "./availability.schemas";
import { AvailabilityService } from "./availability.service";

@Controller("expert/availability")
@Roles("EXPERT")
export class ExpertAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get("rules")
  getOwnAvailability(@CurrentUser() user: PublicUser) {
    return this.availability.getOwnAvailability(user.id);
  }

  @Put("rules")
  replaceRules(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(replaceAvailabilityRulesSchema))
    input: ReplaceAvailabilityRulesInput,
  ) {
    return this.availability.replaceRules(user.id, input.rules);
  }

  @Post("exceptions")
  createException(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(createAvailabilityExceptionSchema))
    input: CreateAvailabilityExceptionInput,
  ) {
    return this.availability.createException(user.id, input);
  }

  @Delete("exceptions/:exceptionId")
  @HttpCode(204)
  async deleteException(
    @CurrentUser() user: PublicUser,
    @Param("exceptionId", new ParseUUIDPipe()) exceptionId: string,
  ) {
    await this.availability.deleteException(user.id, exceptionId);
  }
}

@Controller("experts/:expertProfileId/availability")
@Public()
export class PublicAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  getPublicAvailability(
    @Param("expertProfileId", new ParseUUIDPipe()) expertProfileId: string,
    @Query(new ZodValidationPipe(publicAvailabilityQuerySchema))
    query: PublicAvailabilityQuery,
  ) {
    return this.availability.getPublicAvailability(expertProfileId, query);
  }
}
