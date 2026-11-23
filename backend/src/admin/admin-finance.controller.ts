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
import { AdminFinanceService } from "./admin-finance.service";
import {
  listAdminPaymentsQuerySchema,
  listAdminPayoutsQuerySchema,
  listAdminRefundsQuerySchema,
  markPayoutPaidSchema,
  type ListAdminPaymentsQuery,
  type ListAdminPayoutsQuery,
  type ListAdminRefundsQuery,
  type MarkPayoutPaidInput,
} from "./admin.schemas";

@Controller("admin")
@Roles("ADMIN")
export class AdminFinanceController {
  constructor(private readonly finance: AdminFinanceService) {}

  @Get("payments")
  listPayments(
    @Query(new ZodValidationPipe(listAdminPaymentsQuerySchema))
    query: ListAdminPaymentsQuery,
  ) {
    return this.finance.listPayments(query);
  }

  @Get("refunds")
  listRefunds(
    @Query(new ZodValidationPipe(listAdminRefundsQuerySchema))
    query: ListAdminRefundsQuery,
  ) {
    return this.finance.listRefunds(query);
  }

  @Get("payouts")
  listPayouts(
    @Query(new ZodValidationPipe(listAdminPayoutsQuerySchema))
    query: ListAdminPayoutsQuery,
  ) {
    return this.finance.listPayouts(query);
  }

  @Post("payouts/:payoutId/mark-paid")
  @HttpCode(200)
  markPayoutPaid(
    @CurrentUser() actor: PublicUser,
    @Param("payoutId", new ParseUUIDPipe()) payoutId: string,
    @Body(new ZodValidationPipe(markPayoutPaidSchema))
    input: MarkPayoutPaidInput,
  ) {
    return this.finance.markPayoutPaid(actor, payoutId, input);
  }
}
