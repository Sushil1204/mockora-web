import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import type { PublicUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminPricingService } from "./admin-pricing.service";
import {
  createPricingRuleSchema,
  listPricingRulesQuerySchema,
  updatePricingRuleSchema,
  type CreatePricingRuleInput,
  type ListPricingRulesQuery,
  type UpdatePricingRuleInput,
} from "./admin.schemas";

@Controller("admin/pricing-rules")
@Roles("ADMIN")
export class AdminPricingController {
  constructor(private readonly pricing: AdminPricingService) {}

  @Get()
  listRules(
    @Query(new ZodValidationPipe(listPricingRulesQuerySchema))
    query: ListPricingRulesQuery,
  ) {
    return this.pricing.listRules(query);
  }

  @Post()
  @HttpCode(201)
  createRule(
    @CurrentUser() actor: PublicUser,
    @Body(new ZodValidationPipe(createPricingRuleSchema))
    input: CreatePricingRuleInput,
  ) {
    return this.pricing.createRule(actor, input);
  }

  @Patch(":ruleId")
  @HttpCode(200)
  updateRule(
    @CurrentUser() actor: PublicUser,
    @Param("ruleId", new ParseUUIDPipe()) ruleId: string,
    @Body(new ZodValidationPipe(updatePricingRuleSchema))
    input: UpdatePricingRuleInput,
  ) {
    return this.pricing.updateRule(actor, ruleId, input);
  }
}
