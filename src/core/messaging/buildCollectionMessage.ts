import { buildWhatsappUrl } from "@/core/messaging/buildWhatsappUrl";
import { resolvePaymentLinkFromPayload } from "@/core/messaging/resolvePaymentLink";
import {
  formatIlsAmountDigitsForTemplate,
  formatPurchaseDateSuffixHebrew,
  messagingTemplates,
  resolveDebtAmountForSms,
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

  const resolvedAmount = resolveDebtAmountForSms(input.debt);
  const amountDigits = formatIlsAmountDigitsForTemplate(resolvedAmount);
  const amountLine = amountDigits
    ? `יש לך תשלום פתוח על סך ₪${amountDigits}`
    : messagingTemplates.missingAmountPhrase;

  const purchaseSuffix =
    input.purchaseDateDisplay?.trim() || formatPurchaseDateSuffixHebrew(input.debt.purchaseDate) || null;

  const lines: string[] = [`${businessName} 💸`, "", `היי ${customerName},`, "", amountLine];

  if (purchaseSuffix) {
    lines.push("", `מיום ${purchaseSuffix}`);
  }

  lines.push("", messagingTemplates.payOrUpdateLine, "", paymentUrl);

  const messageText = lines.join("\n");

  const normalizedPaymentMethods = normalizePaymentMethods(input.paymentMethods);
  const items = input.debt.items ?? [];

  return {
    messageText,
    whatsappUrl: buildWhatsappUrl(input.customer.phone, messageText),
    metadata: {
      includedPaymentMethods: normalizedPaymentMethods,
      includesItems: items.length > 0,
      includesAmount: Boolean(amountDigits),
      includesPurchaseDate: Boolean(purchaseSuffix),
      resolvedPaymentLink: paymentUrl,
    },
  };
}
