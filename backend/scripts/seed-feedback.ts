import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import {
  DEFAULT_FEEDBACK_CRITERIA,
  DEFAULT_FEEDBACK_TEMPLATE_NAME,
  DEFAULT_FEEDBACK_TEMPLATE_VERSION,
} from "../src/feedback/default-template";

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.feedbackTemplate.upsert({
    where: {
      name_version: {
        name: DEFAULT_FEEDBACK_TEMPLATE_NAME,
        version: DEFAULT_FEEDBACK_TEMPLATE_VERSION,
      },
    },
    create: {
      name: DEFAULT_FEEDBACK_TEMPLATE_NAME,
      version: DEFAULT_FEEDBACK_TEMPLATE_VERSION,
      isActive: true,
    },
    update: { isActive: true },
  });

  for (const [index, criterion] of DEFAULT_FEEDBACK_CRITERIA.entries()) {
    await prisma.feedbackCriterion.upsert({
      where: {
        templateId_sortOrder: {
          templateId: template.id,
          sortOrder: index + 1,
        },
      },
      create: {
        templateId: template.id,
        name: criterion.name,
        description: criterion.description,
        weight: 1,
        sortOrder: index + 1,
      },
      update: {
        name: criterion.name,
        description: criterion.description,
        weight: 1,
      },
    });
  }

  console.log(
    `Seeded feedback template "${template.name}" v${template.version} with ${DEFAULT_FEEDBACK_CRITERIA.length} criteria.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
