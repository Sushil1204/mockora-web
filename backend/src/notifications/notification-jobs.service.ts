import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval, Timeout } from "@nestjs/schedule";

import { BookingsService } from "../bookings/bookings.service";
import { NotificationsService } from "./notifications.service";

const JOB_INTERVAL_MS = 30_000;

@Injectable()
export class NotificationJobsService {
  private readonly logger = new Logger(NotificationJobsService.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly bookings: BookingsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Timeout(5_000)
  async runOnStartup(): Promise<void> {
    await this.runOnce();
  }

  @Interval(JOB_INTERVAL_MS)
  async runOnInterval(): Promise<void> {
    await this.runOnce();
  }

  async runOnce(): Promise<void> {
    if (this.config.get<string>("NODE_ENV") === "test" || this.running) {
      return;
    }

    this.running = true;

    try {
      await this.bookings.expireOverdueBookings();
      await this.notifications.runMaintenance();
    } catch (error) {
      this.logger.error(
        "Notification maintenance job failed; it will retry on the next interval.",
        error as Error,
      );
    } finally {
      this.running = false;
    }
  }
}
