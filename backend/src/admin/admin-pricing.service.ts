import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { PublicUser } from "../auth/auth.types";
import { AppException } from "../common/errors/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import type {
  CreatePricingRuleInput,
  ListPricingRulesQuery,
  UpdatePricingRuleInput,
} from "./admin.schemas";

const pricingRuleInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PricingRuleInclude;

type PricingRuleRecord = Prisma.PricingRuleGetPayload<{
  include: typeof pricingRuleInclude;
}>;

@Injectable()
export class AdminPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listRules(query: ListPricingRulesQuery) {
    const rules = await this.prisma.pricingRule.findMany({
      where: query.includeInactive ? undefined : { isActive: true },
      orderBy: [
        { durationMinutes: "asc" },
        { effectiveFrom: "desc" },
        { createdAt: "desc" },
      ],
      include: pricingRuleInclude,
    });

    return { rules: rules.map(toPricingRuleResponse) };
  }

  async createRule(actor: PublicUser, input: CreatePricingRuleInput) {
    const effectiveFrom = input.effectiveFrom
      ? new Date(input.effectiveFrom)
      : new Date();
    const effectiveUntil = input.effectiveUntil
      ? new Date(input.effectiveUntil)
      : null;

    assertValidAmounts(input.candidatePriceAmount, input.expertPayoutAmount);
    assertValidWindow(effectiveFrom, effectiveUntil);

    const rule = await this.prisma.$transaction(async (tx) => {
      if (input.isActive) {
        await assertNoOverlap(tx, {
          durationMinutes: input.durationMinutes,
          effectiveFrom,
          effectiveUntil,
        });
      }

      const created = await tx.pricingRule.create({
        data: {
          durationMinutes: input.durationMinutes,
          candidatePriceAmount: input.candidatePriceAmount,
          expertPayoutAmount: input.expertPayoutAmount,
          platformAmount: input.candidatePriceAmount - input.expertPayoutAmount,
          currency: input.currency,
          effectiveFrom,
          effectiveUntil,
          isActive: input.isActive,
          createdById: actor.id,
        },
        include: pricingRuleInclude,
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: "PRICING_RULE_CREATED",
        entityType: "PRICING_RULE",
        entityId: created.id,
        afterState: pricingSnapshot(created),
      });

      return created;
    });

    return { rule: toPricingRuleResponse(rule) };
  }

  async updateRule(
    actor: PublicUser,
    ruleId: string,
    input: UpdatePricingRuleInput,
  ) {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { id: ruleId },
      include: pricingRuleInclude,
    });

    if (!rule) {
      throw this.ruleNotFound();
    }

    const candidatePriceAmount =
      input.candidatePriceAmount ?? rule.candidatePriceAmount;
    const expertPayoutAmount =
      input.expertPayoutAmount ?? rule.expertPayoutAmount;
    const effectiveFrom = input.effectiveFrom
      ? new Date(input.effectiveFrom)
      : rule.effectiveFrom;
    const effectiveUntil =
      input.effectiveUntil === undefined
        ? rule.effectiveUntil
        : input.effectiveUntil === null
          ? null
          : new Date(input.effectiveUntil);
    const isActive = input.isActive ?? rule.isActive;

    assertValidAmounts(candidatePriceAmount, expertPayoutAmount);
    assertValidWindow(effectiveFrom, effectiveUntil);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (isActive) {
        await assertNoOverlap(tx, {
          id: rule.id,
          durationMinutes: input.durationMinutes ?? rule.durationMinutes,
          effectiveFrom,
          effectiveUntil,
        });
      }

      const saved = await tx.pricingRule.update({
        where: { id: rule.id },
        data: {
          durationMinutes: input.durationMinutes ?? rule.durationMinutes,
          candidatePriceAmount,
          expertPayoutAmount,
          platformAmount: candidatePriceAmount - expertPayoutAmount,
          currency: input.currency ?? rule.currency,
          effectiveFrom,
          effectiveUntil,
          isActive,
        },
        include: pricingRuleInclude,
      });

      await this.audit.record(tx, {
        actorUserId: actor.id,
        action: "PRICING_RULE_UPDATED",
        entityType: "PRICING_RULE",
        entityId: rule.id,
        beforeState: pricingSnapshot(rule),
        afterState: pricingSnapshot(saved),
      });

      return saved;
    });

    return { rule: toPricingRuleResponse(updated) };
  }

  private ruleNotFound() {
    return new AppException(
      "PRICING_RULE_NOT_FOUND",
      "The requested pricing rule does not exist.",
      HttpStatus.NOT_FOUND,
    );
  }
}

async function assertNoOverlap(
  client: Prisma.TransactionClient | PrismaService,
  input: {
    id?: string;
    durationMinutes: number;
    effectiveFrom: Date;
    effectiveUntil: Date | null;
  },
) {
  const overlapping = await client.pricingRule.findFirst({
    where: {
      id: input.id ? { not: input.id } : undefined,
      durationMinutes: input.durationMinutes,
      isActive: true,
      effectiveFrom: input.effectiveUntil
        ? { lt: input.effectiveUntil }
        : undefined,
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gt: input.effectiveFrom } },
      ],
    },
    select: { id: true, effectiveFrom: true, effectiveUntil: true },
  });

  if (overlapping) {
    throw new AppException(
      "PRICING_RULE_OVERLAP",
      "Another active pricing rule already covers this duration and period.",
      HttpStatus.CONFLICT,
      { conflictingRuleId: overlapping.id },
    );
  }
}

function assertValidAmounts(candidatePrice: number, expertPayout: number) {
  if (expertPayout >= candidatePrice) {
    throw new AppException(
      "INVALID_PRICING_SPLIT",
      "The expert payout must be lower than the candidate price.",
      HttpStatus.BAD_REQUEST,
    );
  }
}

function assertValidWindow(from: Date, until: Date | null) {
  if (until && until <= from) {
    throw new AppException(
      "INVALID_PRICING_WINDOW",
      "The effective end must be after the start.",
      HttpStatus.BAD_REQUEST,
    );
  }
}

function pricingSnapshot(rule: PricingRuleRecord) {
  return {
    durationMinutes: rule.durationMinutes,
    candidatePriceAmount: rule.candidatePriceAmount,
    expertPayoutAmount: rule.expertPayoutAmount,
    platformAmount: rule.platformAmount,
    currency: rule.currency,
    effectiveFrom: rule.effectiveFrom.toISOString(),
    effectiveUntil: rule.effectiveUntil?.toISOString() ?? null,
    isActive: rule.isActive,
  };
}

function toPricingRuleResponse(rule: PricingRuleRecord) {
  return {
    id: rule.id,
    durationMinutes: rule.durationMinutes,
    candidatePriceAmount: rule.candidatePriceAmount,
    expertPayoutAmount: rule.expertPayoutAmount,
    platformAmount: rule.platformAmount,
    commissionPercent:
      Math.round((rule.platformAmount / rule.candidatePriceAmount) * 1000) / 10,
    currency: rule.currency,
    effectiveFrom: rule.effectiveFrom.toISOString(),
    effectiveUntil: rule.effectiveUntil?.toISOString() ?? null,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    createdBy: rule.createdBy,
  };
}
