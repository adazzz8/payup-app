import type { BuildCollectionMessageInput } from "@/core/messaging/types";

/**
 * Production: full payment URL must come from Base44 (`paymentLink` only).
 * No token composition or alternate formats in Core.
 */
export function resolvePaymentLinkFromPayload(input: BuildCollectionMessageInput): string {
  const link = input.paymentLink?.trim();
  if (link) {
    return link;
  }

  throw new Error("paymentLink is required: Base44 must send the full pay URL for this debt/customer.");
}
