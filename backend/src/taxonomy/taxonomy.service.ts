import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async getTaxonomy() {
    const [industries, interviewTypes, experienceLevels] = await Promise.all([
      this.prisma.industry.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          jobRoles: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
          specializations: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
      }),
      this.prisma.interviewType.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.experienceLevel.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return {
      industries: industries.map((industry) => ({
        id: industry.id,
        name: industry.name,
        slug: industry.slug,
        jobRoles: industry.jobRoles.map((role) => ({
          id: role.id,
          name: role.name,
          slug: role.slug,
        })),
        specializations: industry.specializations.map((specialization) => ({
          id: specialization.id,
          name: specialization.name,
          slug: specialization.slug,
        })),
      })),
      interviewTypes: interviewTypes.map((type) => ({
        id: type.id,
        name: type.name,
        slug: type.slug,
      })),
      experienceLevels: experienceLevels.map((level) => ({
        id: level.id,
        name: level.name,
        sortOrder: level.sortOrder,
      })),
    };
  }
}
