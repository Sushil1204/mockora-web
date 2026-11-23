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
import { AdminBookingsService } from "./admin-bookings.service";
import {
  adminCancelBookingSchema,
  listAdminBookingsQuerySchema,
  type AdminCancelBookingInput,
  type ListAdminBookingsQuery,
} from "./admin.schemas";

@Controller("admin/bookings")
@Roles("ADMIN")
export class AdminBookingsController {
  constructor(private readonly bookings: AdminBookingsService) {}

  @Get()
  listBookings(
    @Query(new ZodValidationPipe(listAdminBookingsQuerySchema))
    query: ListAdminBookingsQuery,
  ) {
    return this.bookings.listBookings(query);
  }

  @Get(":bookingId")
  getBooking(@Param("bookingId", new ParseUUIDPipe()) bookingId: string) {
    return this.bookings.getBooking(bookingId);
  }

  @Post(":bookingId/cancel")
  @HttpCode(200)
  cancel(
    @CurrentUser() actor: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(adminCancelBookingSchema))
    input: AdminCancelBookingInput,
  ) {
    return this.bookings.cancel(actor, bookingId, input);
  }
}
