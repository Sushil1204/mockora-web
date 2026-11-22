import { Body, Controller, Get, HttpCode, Patch, Post } from "@nestjs/common";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { PublicUser } from "../auth/auth.types";
import {
  updateExpertApplicationSchema,
  type UpdateExpertApplicationInput,
} from "./expert.schemas";
import { ExpertService } from "./expert.service";

@Controller("expert")
export class ExpertController {
  constructor(private readonly expert: ExpertService) {}

  @Get("application")
  getApplication(@CurrentUser() user: PublicUser) {
    return this.expert.getApplication(user.id);
  }

  @Patch("application")
  updateApplication(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(updateExpertApplicationSchema))
    input: UpdateExpertApplicationInput,
  ) {
    return this.expert.updateApplication(user.id, input);
  }

  @Post("application")
  @HttpCode(200)
  submitApplication(@CurrentUser() user: PublicUser) {
    return this.expert.submitApplication(user.id);
  }

  @Get("profile")
  @Roles("EXPERT")
  getProfile(@CurrentUser() user: PublicUser) {
    return this.expert.getProfile(user.id);
  }

  @Patch("profile")
  @Roles("EXPERT")
  updateProfile(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(updateExpertApplicationSchema))
    input: UpdateExpertApplicationInput,
  ) {
    return this.expert.updateProfile(user.id, input);
  }
}
