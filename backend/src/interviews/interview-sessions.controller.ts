import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";

import type { PublicUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { InterviewSessionsService } from "./interview-sessions.service";

@Controller("bookings")
export class InterviewSessionsController {
  constructor(private readonly interviews: InterviewSessionsService) {}

  @Get(":bookingId/interview-session")
  getSession(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.interviews.getSession(user, bookingId);
  }

  @Post(":bookingId/interview-session/token")
  @HttpCode(200)
  issueToken(
    @CurrentUser() user: PublicUser,
    @Param("bookingId", new ParseUUIDPipe()) bookingId: string,
  ) {
    return this.interviews.issueToken(user, bookingId);
  }
}
