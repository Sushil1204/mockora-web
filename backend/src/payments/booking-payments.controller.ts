import {
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";

import type { PublicUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { PaymentsService } from "./payments.service";

@Controller("bookings")
export class BookingPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(":bookingId/payment-attempts")
  @Roles("CANDIDATE")
  createAttempt(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.payments.createAttempt(user, bookingId, idempotencyKey);
  }
}
