import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { InterviewSessionsController } from "./interview-sessions.controller";
import { InterviewSessionsService } from "./interview-sessions.service";

@Module({
  imports: [NotificationsModule],
  controllers: [InterviewSessionsController],
  providers: [InterviewSessionsService],
  exports: [InterviewSessionsService],
})
export class InterviewSessionsModule {}
