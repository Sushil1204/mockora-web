import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";

import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminFeedbackService } from "./admin-feedback.service";
import {
  listAdminFeedbackQuerySchema,
  type ListAdminFeedbackQuery,
} from "./admin.schemas";

@Controller("admin/feedback")
@Roles("ADMIN")
export class AdminFeedbackController {
  constructor(private readonly feedback: AdminFeedbackService) {}

  @Get()
  listReports(
    @Query(new ZodValidationPipe(listAdminFeedbackQuerySchema))
    query: ListAdminFeedbackQuery,
  ) {
    return this.feedback.listReports(query);
  }

  @Get(":reportId")
  getReport(@Param("reportId", new ParseUUIDPipe()) reportId: string) {
    return this.feedback.getReport(reportId);
  }
}
