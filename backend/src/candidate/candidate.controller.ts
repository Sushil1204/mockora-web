import { Body, Controller, Get, Put } from "@nestjs/common";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { PublicUser } from "../auth/auth.types";
import {
  updateCandidateProfileSchema,
  type UpdateCandidateProfileInput,
} from "./candidate.schemas";
import { CandidateService } from "./candidate.service";

@Controller("candidate/profile")
@Roles("CANDIDATE")
export class CandidateController {
  constructor(private readonly candidate: CandidateService) {}

  @Get()
  getProfile(@CurrentUser() user: PublicUser) {
    return this.candidate.getProfile(user.id);
  }

  @Put()
  updateProfile(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(updateCandidateProfileSchema))
    input: UpdateCandidateProfileInput,
  ) {
    return this.candidate.updateProfile(user.id, input);
  }
}
