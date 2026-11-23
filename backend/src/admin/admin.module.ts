import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { AdminAnalyticsController } from "./admin-analytics.controller";
import { AdminAnalyticsService } from "./admin-analytics.service";
import { AdminAuditController } from "./admin-audit.controller";
import { AdminBookingsController } from "./admin-bookings.controller";
import { AdminBookingsService } from "./admin-bookings.service";
import { AdminExpertsController } from "./admin-experts.controller";
import { AdminExpertsService } from "./admin-experts.service";
import { AdminFeedbackController } from "./admin-feedback.controller";
import { AdminFeedbackService } from "./admin-feedback.service";
import { AdminFinanceController } from "./admin-finance.controller";
import { AdminFinanceService } from "./admin-finance.service";
import { AdminPeopleController } from "./admin-people.controller";
import { AdminPeopleService } from "./admin-people.service";
import { AdminPricingController } from "./admin-pricing.controller";
import { AdminPricingService } from "./admin-pricing.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditService } from "./audit.service";

@Module({
  imports: [BookingsModule],
  controllers: [
    AdminController,
    AdminAuditController,
    AdminAnalyticsController,
    AdminBookingsController,
    AdminExpertsController,
    AdminFeedbackController,
    AdminFinanceController,
    AdminPeopleController,
    AdminPricingController,
  ],
  providers: [
    AdminService,
    AdminExpertsService,
    AdminAnalyticsService,
    AdminBookingsService,
    AdminFeedbackService,
    AdminFinanceService,
    AdminPeopleService,
    AdminPricingService,
    AuditService,
  ],
})
export class AdminModule {}
