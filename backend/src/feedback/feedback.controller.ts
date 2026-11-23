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
  submitFeedbackSchema,
  submitReviewSchema,
  type SubmitFeedbackInput,
  type SubmitReviewInput,
} from "./feedback.schemas";
import { FeedbackService } from "./feedback.service";

@Controller()
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get("bookings/:bookingId/feedback")
  getFeedback(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.feedback.getFeedback(user, bookingId);
  }

  @Post("bookings/:bookingId/feedback")
  @Roles("EXPERT")
  @HttpCode(201)
  submitFeedback(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(submitFeedbackSchema))
    input: SubmitFeedbackInput,
  ) {
    return this.feedback.submitFeedback(user, bookingId, input);
  }

  @Post("bookings/:bookingId/review")
  @Roles("CANDIDATE")
  @HttpCode(201)
  submitReview(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
    @Body(new ZodValidationPipe(submitReviewSchema))
    input: SubmitReviewInput,
  ) {
    return this.feedback.submitReview(user, bookingId, input);
  }

  @Get("candidate/reports")
  @Roles("CANDIDATE")
  listReports(@CurrentUser() user: PublicUser) {
    return this.feedback.listReports(user);
  }
}
