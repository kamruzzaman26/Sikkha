export type PaymentInitiationRequest = {
  orderId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
};

export type PaymentInitiation = {
  reference: string;
  redirectUrl: string;
};

export type VerifiedPayment = {
  verified: true;
  orderId: string;
  amountMinor: number;
  currency: string;
  transactionId: string;
  status: "pending" | "paid" | "failed" | "cancelled";
};

export interface PaymentGatewayAdapter<Callback = unknown, Webhook = unknown> {
  initiatePayment(
    request: PaymentInitiationRequest,
  ): Promise<PaymentInitiation>;
  verifyCallback(callback: Callback): Promise<VerifiedPayment>;
  verifyWebhook(webhook: Webhook): Promise<VerifiedPayment>;
}
