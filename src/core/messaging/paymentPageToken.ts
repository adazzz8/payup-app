import { createHmac, randomBytes } from "crypto";

const DEFAULT_PAY_BASE = "https://getpayup.io/pay";

export type PaymentLinkPayload = {
  debtId: string;
  customerId: string;
  issuedAt: number;
  nonce: string;
};

export function getPaymentPageBaseUrl(): string {
  const base = process.env.PAYUP_PAYMENT_PAGE_BASE?.trim();
  return base && base.length > 0 ? base.replace(/\/$/, "") : DEFAULT_PAY_BASE;
}

/**
 * Creates a signed, opaque token for https://getpayup.io/pay/[token]
 * Verify with the same PAYUP_PAYMENT_LINK_SECRET on Base44 / edge when resolving the pay page.
 */
export function createSignedPaymentPageToken(input: { debtId: string; customerId: string }): string {
  const secret = process.env.PAYUP_PAYMENT_LINK_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "PAYUP_PAYMENT_LINK_SECRET must be set (min 16 characters) to generate payment page links.",
    );
  }

  const issuedAt = Date.now();
  const nonce = randomBytes(8).toString("hex");
  const body: PaymentLinkPayload = {
    debtId: input.debtId,
    customerId: input.customerId,
    issuedAt,
    nonce,
  };

  const payload = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");

  return `${payload}.${sig}`;
}

export function buildPaymentPageUrl(token: string): string {
  return `${getPaymentPageBaseUrl()}/${token}`;
}
