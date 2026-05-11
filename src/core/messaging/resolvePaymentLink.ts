import type { BuildCollectionMessageInput } from "@/core/messaging/types";

/**
 * Base44 supplies the full URL; Core never composes or signs payment links.
 */
export function resolvePaymentLinkFromPayload(input: BuildCollectionMessageInput): string {
  const link = input.paymentLink.trim();
  if (!link) {
    throw new Error("paymentLink is empty; Base44 must send the full https URL for this debt/customer.");
  }
  return link;
}
