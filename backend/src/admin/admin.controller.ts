import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { PublicUser } from "../auth/auth.types";
import { grantRoleSchema, type GrantRoleInput } from "../auth/auth.schemas";
import { AdminService } from "./admin.service";

@Controller("admin/users")
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post(":userId/roles")
  @HttpCode(200)
  async grantRole(
    @CurrentUser() actor: PublicUser,
    @Param("userId", new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(grantRoleSchema)) input: GrantRoleInput,
  ) {
    return {
      user: await this.admin.grantRole(actor, userId, input.role),
    };
  }
}
