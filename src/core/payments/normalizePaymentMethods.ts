import type { NormalizedPaymentMethod, PaymentMethodInput, PaymentMethodType } from "@/core/payments/types";

const paymentLabels: Record<PaymentMethodType, string> = {
  bit: "Bit",
  paybox: "PayBox",
  credit_link: "קישור אשראי",
  bank_transfer: "העברה בנקאית",
  cash: "מזומן",
};

export function normalizePaymentMethods(input: PaymentMethodInput[]): NormalizedPaymentMethod[] {
  return input
    .filter((method) => method.isActive)
    .filter((method) => {
      if (method.type === "cash") {
        return true;
      }

      return Boolean(method.value && method.value.trim().length > 0);
    })
    .map((method) => ({
      type: method.type,
      label: paymentLabels[method.type],
      value: method.value?.trim(),
    }));
}
