import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval } from "@nestjs/schedule";

import { InterviewSessionsService } from "./interview-sessions.service";

@Injectable()
export class InterviewSessionJobsService {
  private readonly logger = new Logger(InterviewSessionJobsService.name);

  constructor(
    private readonly interviews: InterviewSessionsService,
    private readonly config: ConfigService,
  ) {}

  @Interval(60_000)
  async closeElapsedSessions(): Promise<void> {
    if (this.config.get<string>("NODE_ENV") === "test") {
      return;
    }

    try {
      await this.interviews.closeElapsedSessions();
    } catch (error) {
      this.logger.error(
        "Interview session cleanup failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
