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

const HEBREW_WEEKDAY_SHORT_EN: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const HEBREW_WEEKDAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

/**
 * מיום שלישי ה-7.5 — לפי ירושלים (Asia/Jerusalem).
 * purchaseDate: ISO string (למשל 2026-05-07 או 2026-05-07T12:00:00Z)
 */
export function formatPurchaseDateLineHebrew(purchaseDate: string | null | undefined): string | null {
  if (!purchaseDate || typeof purchaseDate !== "string" || purchaseDate.trim().length === 0) {
    return null;
  }

  const d = new Date(purchaseDate.trim());
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const tz = "Asia/Jerusalem";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);

  const weekdayToken = parts.find((p) => p.type === "weekday")?.value;
  const dayStr = parts.find((p) => p.type === "day")?.value;
  const monthStr = parts.find((p) => p.type === "month")?.value;

  if (!weekdayToken || !dayStr || !monthStr) {
    return null;
  }

  const idx = HEBREW_WEEKDAY_SHORT_EN[weekdayToken];
  if (idx === undefined) {
    return null;
  }

  const weekdayHe = HEBREW_WEEKDAY_NAMES[idx];
  const day = Number(dayStr);
  const month = Number(monthStr);
  if (!Number.isFinite(day) || !Number.isFinite(month)) {
    return null;
  }

  return `מיום ${weekdayHe} ה-${day}.${month}`;
}
