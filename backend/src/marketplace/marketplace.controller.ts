import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";

import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  listExpertsQuerySchema,
  type ListExpertsQuery,
} from "./marketplace.schemas";
import { MarketplaceService } from "./marketplace.service";

@Controller("experts")
@Public()
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  listExperts(
    @Query(new ZodValidationPipe(listExpertsQuerySchema))
    query: ListExpertsQuery,
  ) {
    return this.marketplace.listExperts(query);
  }

  @Get("filters")
  getFilters() {
    return this.marketplace.getFilters();
  }

  @Get(":expertProfileId")
  getExpert(
    @Param("expertProfileId", new ParseUUIDPipe()) expertProfileId: string,
  ) {
    return this.marketplace.getExpert(expertProfileId);
  }
}
