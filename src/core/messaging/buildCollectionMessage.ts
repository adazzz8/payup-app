import { normalizePaymentMethods } from "@/core/payments/normalizePaymentMethods";
import { buildWhatsappUrl } from "@/core/messaging/buildWhatsappUrl";
import { formatIlsAmount, messagingTemplates } from "@/core/messaging/templates";
import type { BuildCollectionMessageInput, BuildCollectionMessageOutput } from "@/core/messaging/types";

function buildItemsSection(input: BuildCollectionMessageInput): { text: string; includesItems: boolean } {
  const items = input.debt.items ?? [];

  if (items.length === 0) {
    return {
      text: `${messagingTemplates.itemsTitle}\n- ${messagingTemplates.missingItemsFallback}`,
      includesItems: false,
    };
  }

  const lines = items.map((item) => {
    const quantity = item.quantity ?? 1;
    const lineTotal = item.lineTotal ?? null;
    const formattedLineTotal = formatIlsAmount(lineTotal);
    const suffix = formattedLineTotal ? ` (${formattedLineTotal})` : "";
    return `- ${item.productName} x${quantity}${suffix}`;
  });

  return {
    text: `${messagingTemplates.itemsTitle}\n${lines.join("\n")}`,
    includesItems: true,
  };
}

function buildPaymentSection(input: BuildCollectionMessageInput): { text: string; methodsCount: number } {
  const methods = normalizePaymentMethods(input.paymentMethods);
  if (methods.length === 0) {
    return {
      text: `${messagingTemplates.paymentTitle}\n- אין כרגע אמצעי תשלום פעיל. נא ליצור קשר עם העסק.`,
      methodsCount: 0,
    };
  }

  const lines = methods.map((method) => {
    if (method.value) {
      return `- ${method.label}: ${method.value}`;
    }

    return `- ${method.label}`;
  });

  return {
    text: `${messagingTemplates.paymentTitle}\n${lines.join("\n")}`,
    methodsCount: methods.length,
  };
}

export function buildCollectionMessage(input: BuildCollectionMessageInput): BuildCollectionMessageOutput {
  const customerName = input.customer.fullName?.trim() || "לקוח/ה";
  const businessName = input.business.businessName;
  const amount = formatIlsAmount(input.debt.totalAmount);

  const itemsSection = buildItemsSection(input);
  const paymentSection = buildPaymentSection(input);
  const normalizedPaymentMethods = normalizePaymentMethods(input.paymentMethods);

  const amountLine = amount ? `סה"כ לתשלום: ${amount}` : messagingTemplates.missingAmountFallback;

  const messageText = [
    `${messagingTemplates.greeting} ${customerName},`,
    "",
    `${messagingTemplates.intro} מ-${businessName}`,
    amountLine,
    "",
    itemsSection.text,
    "",
    paymentSection.text,
  ].join("\n");

  return {
    messageText,
    whatsappUrl: buildWhatsappUrl(input.customer.phone, messageText),
    metadata: {
      includedPaymentMethods: normalizedPaymentMethods,
      includesItems: itemsSection.includesItems,
      includesAmount: Boolean(amount),
    },
  };
}
