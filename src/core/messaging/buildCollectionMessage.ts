import { buildWhatsappUrl } from "@/core/messaging/buildWhatsappUrl";
import { buildPaymentPageUrl, createSignedPaymentPageToken } from "@/core/messaging/paymentPageToken";
import {
  formatIlsAmountShort,
  formatPurchaseDateLineHebrew,
  messagingTemplates,
} from "@/core/messaging/templates";
import type { BuildCollectionMessageInput, BuildCollectionMessageOutput } from "@/core/messaging/types";
import { normalizePaymentMethods } from "@/core/payments/normalizePaymentMethods";

/**
 * Short SMS: triggers open of payment page only (no item list or payment rails in text).
 */
export function buildCollectionMessage(input: BuildCollectionMessageInput): BuildCollectionMessageOutput {
  const businessName = input.business.businessName.trim();
  const headerLine = `${businessName} 💸`;

  const amountShort = formatIlsAmountShort(input.debt.totalAmount);
  const amountLine = amountShort
    ? `${messagingTemplates.openPaymentLine} ${amountShort}`
    : messagingTemplates.missingAmountPhrase;

  const purchaseDateLine = formatPurchaseDateLineHebrew(input.debt.purchaseDate);

  const paymentPageToken = createSignedPaymentPageToken({
    debtId: input.debt.id,
    customerId: input.customer.id,
  });
  const paymentPageUrl = buildPaymentPageUrl(paymentPageToken);

  const bodyAfterAmount = purchaseDateLine ? [amountLine, purchaseDateLine] : [amountLine];

  const messageText = [headerLine, "", ...bodyAfterAmount, "", messagingTemplates.payOrUpdateLine, paymentPageUrl].join(
    "\n",
  );

  const normalizedPaymentMethods = normalizePaymentMethods(input.paymentMethods);
  const items = input.debt.items ?? [];

  return {
    messageText,
    whatsappUrl: buildWhatsappUrl(input.customer.phone, messageText),
    metadata: {
      includedPaymentMethods: normalizedPaymentMethods,
      includesItems: items.length > 0,
      includesAmount: Boolean(amountShort),
      includesPurchaseDate: Boolean(purchaseDateLine),
      paymentPageUrl,
      paymentPageToken,
    },
  };
}
