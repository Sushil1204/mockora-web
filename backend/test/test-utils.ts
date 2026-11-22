import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return app;
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
}

export function getCookieHeader(
  setCookie: string | string[] | undefined,
): string {
  if (!setCookie) {
    throw new Error("Expected a Set-Cookie response header.");
  }

  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return first.split(";")[0];
}

export const DEFAULT_PASSWORD = "correct-horse-battery";
