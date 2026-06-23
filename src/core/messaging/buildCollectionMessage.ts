import { buildWhatsappUrl } from "@/core/messaging/buildWhatsappUrl";
import { resolvePaymentLinkFromPayload } from "@/core/messaging/resolvePaymentLink";
import {
  buildInitialPaymentRequestMessage,
  formatIlsAmountDigitsForTemplate,
  formatPurchaseDateSuffixHebrew,
  resolveCollectionMessageAmount,
} from "@/core/messaging/templates";
import type { BuildCollectionMessageInput, BuildCollectionMessageOutput } from "@/core/messaging/types";
import { normalizePaymentMethods } from "@/core/payments/normalizePaymentMethods";

/**
 * Final SMS only — Twilio/provider unchanged elsewhere.
 */
export function buildCollectionMessage(input: BuildCollectionMessageInput): BuildCollectionMessageOutput {
  const businessName = input.business.businessName.trim();
  const customerName = input.customer.fullName?.trim() || "שם";
  const paymentUrl = resolvePaymentLinkFromPayload(input);

  const resolvedAmount = resolveCollectionMessageAmount(input);
  const amountDigits = formatIlsAmountDigitsForTemplate(resolvedAmount);
  const aggregatedItems = input.aggregatedItems ?? [];
  const purchaseSuffix =
    input.purchaseDateDisplay?.trim() || formatPurchaseDateSuffixHebrew(input.debt.purchaseDate) || null;

  const openDebtsCount =
    input.isAggregated === true && aggregatedItems.length > 0 ? aggregatedItems.length : 1;

  const messageText = buildInitialPaymentRequestMessage({
    customerName,
    businessName,
    openDebtsCount,
    totalAmountDigits: amountDigits,
    paymentLink: paymentUrl,
  });

  const normalizedPaymentMethods = normalizePaymentMethods(input.paymentMethods);
  const items = input.debt.items ?? [];

  return {
    messageText,
    whatsappUrl: buildWhatsappUrl(input.customer.phone, messageText),
    metadata: {
      includedPaymentMethods: normalizedPaymentMethods,
      includesItems: items.length > 0,
      includesAmount: Boolean(amountDigits),
      includesPurchaseDate: input.isAggregated !== true && Boolean(purchaseSuffix),
      resolvedPaymentLink: paymentUrl,
    },
  };
}
