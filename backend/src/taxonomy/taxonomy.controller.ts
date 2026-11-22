import { Controller, Get } from "@nestjs/common";

import { TaxonomyService } from "./taxonomy.service";

@Controller("taxonomies")
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get()
  async getTaxonomy() {
    return this.taxonomy.getTaxonomy();
  }
}
