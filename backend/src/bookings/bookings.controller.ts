import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { PublicUser } from "../auth/auth.types";
import {
  createBookingSchema,
  declineBookingSchema,
  listBookingsQuerySchema,
  type CreateBookingInput,
  type DeclineBookingInput,
  type ListBookingsQuery,
} from "./bookings.schemas";
import { BookingsService } from "./bookings.service";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @Roles("CANDIDATE")
  createBooking(
    @CurrentUser() user: PublicUser,
    @Body(new ZodValidationPipe(createBookingSchema))
    input: CreateBookingInput,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.bookings.createBooking(user, input, idempotencyKey);
  }

  @Get()
  listBookings(
    @CurrentUser() user: PublicUser,
    @Query(new ZodValidationPipe(listBookingsQuerySchema))
    query: ListBookingsQuery,
  ) {
    return this.bookings.listBookings(user, query);
  }

  @Get(":bookingId")
  getBooking(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.bookings.getBooking(user, bookingId);
  }

  @Post(":bookingId/approve")
  @Roles("EXPERT")
  @HttpCode(200)
  approveBooking(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.bookings.approveBooking(user, bookingId);
  }

  @Post(":bookingId/decline")
  @Roles("EXPERT")
  @HttpCode(200)
  declineBooking(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(declineBookingSchema))
    input: DeclineBookingInput,
  ) {
    return this.bookings.declineBooking(user, bookingId, input);
  }
}
