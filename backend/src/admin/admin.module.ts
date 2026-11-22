import { Module } from "@nestjs/common";

import { AdminExpertsController } from "./admin-experts.controller";
import { AdminExpertsService } from "./admin-experts.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminController, AdminExpertsController],
  providers: [AdminService, AdminExpertsService],
})
export class AdminModule {}
