import { Body, Controller, Get, Patch } from "@nestjs/common";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { PublicUser } from "../auth/auth.types";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "../auth/auth.schemas";
import { AuthService } from "../auth/auth.service";

@Controller("me")
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  getMe(@CurrentUser() user: PublicUser) {
    return { user };
  }

  @Patch()
  async updateMe(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(updateProfileSchema))
    input: UpdateProfileInput,
  ) {
    return { user: await this.auth.updateProfile(user.id, input) };
  }
}
