export const messagingTemplates = {
  payOrUpdateLine: "לתשלום / עדכון:",
  missingAmountPhrase: "יש לך תשלום פתוח - הסכום יוצג בעמוד התשלום.",
} as const;

/** Initial payment request SMS — uses existing payload variables only. */
export function buildInitialPaymentRequestMessage(input: {
  customerName: string;
  businessName: string;
  openDebtsCount: number;
  totalAmountDigits: string | null;
  paymentLink: string;
}): string {
  const summaryLine = input.totalAmountDigits
    ? input.openDebtsCount === 1
      ? `רק רציתי להזכיר שכרגע יש חיוב פתוח אחד, בסכום של ₪${input.totalAmountDigits}.`
      : `רק רציתי להזכיר שכרגע יש ${input.openDebtsCount} חיובים פתוחים, בסכום כולל של ₪${input.totalAmountDigits}.`
    : messagingTemplates.missingAmountPhrase;

  return [
    `שלום ${input.customerName} 😊`,
    "",
    `אני עוזרת לנהל את התשלומים של ${input.businessName}.`,
    "",
    summaryLine,
    "",
    "אפשר לבחור איך להמשיך:",
    "",
    "✅ להסדיר את התשלום עכשיו",
    "",
    "✅ לעדכן שהתשלום כבר בוצע",
    "",
    "✅ לעדכן שהתשלום יבוצע בהמשך",
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ].join("\n");
}

export function parseNumericAmount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  return null;
}

/**
 * Amount field priority for SMS (Base44 may send snake_case or camelCase).
 * 1. outstanding_amount 2. total_amount 3. outstandingAmount 4. totalAmount
 */
export function resolveDebtAmountForSms(debt: {
  outstanding_amount?: unknown;
  total_amount?: unknown;
  outstandingAmount?: unknown;
  totalAmount?: unknown;
}): number | null {
  const candidates = [debt.outstanding_amount, debt.total_amount, debt.outstandingAmount, debt.totalAmount];

  for (const v of candidates) {
    const n = parseNumericAmount(v);
    if (n !== null) {
      return n;
    }
  }

  return null;
}

/** Aggregated reminder uses totalAggregatedAmount; otherwise falls back to debt fields. */
export function resolveCollectionMessageAmount(input: {
  isAggregated?: boolean;
  totalAggregatedAmount?: unknown;
  debt: Parameters<typeof resolveDebtAmountForSms>[0];
}): number | null {
  if (input.isAggregated === true) {
    const aggregated = parseNumericAmount(input.totalAggregatedAmount);
    if (aggregated !== null) {
      return aggregated;
    }
  }
  return resolveDebtAmountForSms(input.debt);
}

/** Digits only for template line: … על סך ₪{{amount}} */
export function formatIlsAmountDigitsForTemplate(amount: number | null | undefined): string | null {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return null;
  }

  return amount % 1 === 0 ? String(Math.trunc(amount)) : amount.toFixed(2);
}

/** Plain ₪ amount for SMS line: ₪78 or ₪78.50 */
export function formatIlsAmountShort(amount: number | null | undefined): string | null {
  const digits = formatIlsAmountDigitsForTemplate(amount);
  return digits ? `₪${digits}` : null;
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

/** For template `מיום {{purchaseDate}}` — value without "מיום " prefix, e.g. שלישי ה-7.5 */
export function formatPurchaseDateSuffixHebrew(purchaseDate: string | null | undefined): string | null {
  const full = formatPurchaseDateLineHebrew(purchaseDate);
  if (!full) {
    return null;
  }
  return full.replace(/^מיום\s+/, "").trim() || null;
}
