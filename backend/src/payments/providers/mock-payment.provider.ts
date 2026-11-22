import { randomUUID } from "node:crypto";

import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AppException } from "../../common/errors/app.exception";
import type {
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  PaymentProvider,
} from "./payment-provider.interface";

export type MockPaymentOutcome = "SUCCESS" | "FAILURE";

export type MockPaymentResult = {
  providerReference: string;
  status: "SUCCEEDED" | "FAILED";
};

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK" as const;

  constructor(private readonly config: ConfigService) {}

  assertEnabled(): void {
    const configuredProvider = this.config.get<string>("PAYMENT_PROVIDER");
    const isProduction = this.config.get<string>("NODE_ENV") === "production";

    if (isProduction || configuredProvider !== "mock") {
      throw new AppException(
        "MOCK_PAYMENT_UNAVAILABLE",
        "Mock payments are not available in this environment.",
        HttpStatus.NOT_FOUND,
      );
    }
  }

  createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    this.assertEnabled();

    return Promise.resolve({
      providerReference: `mock_${input.bookingId.slice(0, 8)}_${randomUUID()}`,
      status: "PENDING",
    });
  }

  simulateResult(
    providerReference: string,
    outcome: MockPaymentOutcome,
  ): MockPaymentResult {
    this.assertEnabled();

    return {
      providerReference,
      status: outcome === "SUCCESS" ? "SUCCEEDED" : "FAILED",
    };
  }
}
