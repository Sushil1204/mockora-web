import { Module } from "@nestjs/common";

import {
  ExpertAvailabilityController,
  PublicAvailabilityController,
} from "./availability.controller";
import { AvailabilityService } from "./availability.service";

@Module({
  controllers: [ExpertAvailabilityController, PublicAvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
