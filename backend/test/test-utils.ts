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
  await prisma.notificationDelivery.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationEvent.deleteMany();
  await prisma.review.deleteMany();
  await prisma.feedbackScore.deleteMany();
  await prisma.feedbackReport.deleteMany();
  await prisma.feedbackCriterion.deleteMany();
  await prisma.feedbackTemplate.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.interviewSession.deleteMany();
  await prisma.slotReservation.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.expertAvailabilityException.deleteMany();
  await prisma.expertAvailabilityRule.deleteMany();
  await prisma.expertExperience.deleteMany();
  await prisma.expertLanguage.deleteMany();
  await prisma.expertCandidateLevel.deleteMany();
  await prisma.expertJobRole.deleteMany();
  await prisma.expertInterviewType.deleteMany();
  await prisma.expertSpecialization.deleteMany();
  await prisma.expertIndustry.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.expertProfile.deleteMany();
  await prisma.jobRole.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.industry.deleteMany();
  await prisma.interviewType.deleteMany();
  await prisma.experienceLevel.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.auditLog.deleteMany();
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
