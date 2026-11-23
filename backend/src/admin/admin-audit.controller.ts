import { Controller, Get, Query } from "@nestjs/common";

import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  listAuditLogsQuerySchema,
  type ListAuditLogsQuery,
} from "./admin.schemas";
import { AdminService } from "./admin.service";

@Controller("admin/audit-logs")
@Roles("ADMIN")
export class AdminAuditController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  listAuditLogs(
    @Query(new ZodValidationPipe(listAuditLogsQuerySchema))
    query: ListAuditLogsQuery,
  ) {
    return this.admin.listAuditLogs(query);
  }
}
