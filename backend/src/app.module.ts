import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { AvailabilityModule } from "./availability/availability.module";
import { BookingsModule } from "./bookings/bookings.module";
import { CandidateModule } from "./candidate/candidate.module";
import { ExpertModule } from "./expert/expert.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { RolesGuard } from "./auth/roles.guard";
import { SessionAuthGuard } from "./auth/session-auth.guard";
import { validateEnv } from "./config/env";
import { HealthController } from "./health/health.controller";
import { InterviewSessionJobsModule } from "./interviews/interview-session-jobs.module";
import { InterviewSessionsModule } from "./interviews/interview-sessions.module";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { NotificationJobsModule } from "./notifications/notification-jobs.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    CandidateModule,
    AvailabilityModule,
    BookingsModule,
    PaymentsModule,
    FeedbackModule,
    InterviewSessionsModule,
    InterviewSessionJobsModule,
    NotificationsModule,
    NotificationJobsModule,
    ExpertModule,
    MarketplaceModule,
    TaxonomyModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
