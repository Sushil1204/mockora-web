import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { NotificationJobsService } from "./notification-jobs.service";
import { NotificationsModule } from "./notifications.module";

@Module({
  imports: [BookingsModule, NotificationsModule],
  providers: [NotificationJobsService],
})
export class NotificationJobsModule {}
