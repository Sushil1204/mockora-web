import {
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
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  listNotificationsQuerySchema,
  type ListNotificationsQuery,
} from "./notifications.schemas";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  listNotifications(
    @CurrentUser() user: PublicUser,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema))
    query: ListNotificationsQuery,
  ) {
    return this.notifications.listNotifications(user.id, query);
  }

  @Post("read-all")
  @HttpCode(200)
  markAllRead(@CurrentUser() user: PublicUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post(":notificationId/read")
  @HttpCode(200)
  markRead(
    @CurrentUser() user: PublicUser,
    @Param("notificationId", new ParseUUIDPipe()) notificationId: string,
  ) {
    return this.notifications.markRead(user.id, notificationId);
  }
}
