export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");

export type PaymentProviderName = "MOCK" | "RAZORPAY";

export type CreateProviderPaymentInput = {
  bookingId: string;
  amount: number | null;
  currency: string | null;
};

export type CreateProviderPaymentResult = {
  providerReference: string;
  status: "PENDING";
};

/**
 * Provider boundary for payment initiation. A future live adapter must keep
 * confirmation server-side and must never trust a frontend result.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult>;
}
