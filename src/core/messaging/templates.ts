export const messagingTemplates = {
  /** Short SMS trigger copy (payment details live on /pay/[token]) */
  openPaymentLine: "יש לך תשלום פתוח על סך",
  payOrUpdateLine: "לתשלום / עדכון:",
  missingAmountPhrase: "יש לך תשלום פתוח — הסכום יוצג בעמוד התשלום.",
} as const;

/** Plain ₪ amount for SMS line: ₪78 or ₪78.50 */
export function formatIlsAmountShort(amount: number | null | undefined): string | null {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return null;
  }

  const formatted = amount % 1 === 0 ? String(Math.trunc(amount)) : amount.toFixed(2);
  return `₪${formatted}`;
}

export function formatIlsAmount(amount: number | null | undefined): string | null {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return null;
  }

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(amount);
}
