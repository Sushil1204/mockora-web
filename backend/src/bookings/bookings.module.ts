import { Module } from "@nestjs/common";

import { AvailabilityModule } from "../availability/availability.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [AvailabilityModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
