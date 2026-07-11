import { buildCustomerPaymentMessage } from "@/core/messaging/buildCustomerPaymentMessage";
import { buildWhatsappUrl } from "@/core/messaging/buildWhatsappUrl";
import { resolveCollectionPaymentMessage } from "@/core/messaging/resolveCollectionPaymentMessage";
import {
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
  const { messageType, payload } = resolveCollectionPaymentMessage(input);
  const messageText = buildCustomerPaymentMessage(messageType, payload);

  const resolvedAmount = resolveCollectionMessageAmount(input);
  const amountDigits = formatIlsAmountDigitsForTemplate(resolvedAmount);
  const purchaseSuffix =
    input.purchaseDateDisplay?.trim() || formatPurchaseDateSuffixHebrew(input.debt.purchaseDate) || null;

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
      resolvedPaymentLink: payload.paymentLink,
    },
  };
}
