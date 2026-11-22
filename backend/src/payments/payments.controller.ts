import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";

import type { PublicUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  mockPaymentResultSchema,
  type MockPaymentResultInput,
} from "./payments.schemas";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@Roles("CANDIDATE")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get(":paymentId")
  getPayment(
    @CurrentUser() user: PublicUser,
    @Param("paymentId", new ParseUUIDPipe()) paymentId: string,
  ) {
    return this.payments.getPayment(user, paymentId);
  }

  @Post(":paymentId/mock-result")
  @HttpCode(200)
  applyMockResult(
    @CurrentUser() user: PublicUser,
    @Param("paymentId", new ParseUUIDPipe()) paymentId: string,
    @Body(new ZodValidationPipe(mockPaymentResultSchema))
    input: MockPaymentResultInput,
  ) {
    return this.payments.applyMockResult(user, paymentId, input);
  }
}
