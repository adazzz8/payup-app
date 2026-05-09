export const messagingTemplates = {
  greeting: "שלום",
  intro: "תזכורת תשלום",
  itemsTitle: "פירוט:",
  paymentTitle: "אפשרויות תשלום פעילות:",
  missingItemsFallback: "לא צורף פירוט פריטים.",
  missingAmountFallback: "סכום לתשלום יעודכן מול העסק.",
} as const;

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
