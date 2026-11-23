import { Controller, Get } from "@nestjs/common";

import { Roles } from "../common/decorators/roles.decorator";
import { AdminAnalyticsService } from "./admin-analytics.service";

@Controller("admin/analytics")
@Roles("ADMIN")
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get()
  getOverview() {
    return this.analytics.getOverview();
  }
}
