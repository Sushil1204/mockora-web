import { Module } from "@nestjs/common";

import { InterviewSessionJobsService } from "./interview-session-jobs.service";
import { InterviewSessionsModule } from "./interview-sessions.module";

@Module({
  imports: [InterviewSessionsModule],
  providers: [InterviewSessionJobsService],
})
export class InterviewSessionJobsModule {}
