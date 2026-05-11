export type DebtItem = {
  productName: string;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

export type DebtContext = {
  id: string;
  /** Priority for SMS amount is resolved in resolveDebtAmountForSms (snake + camel). */
  outstanding_amount?: number | string | null;
  total_amount?: number | string | null;
  outstandingAmount?: number | string | null;
  totalAmount?: number | string | null;
  currency?: "ILS" | string | null;
  /** תאריך/זמן הקנייה (ISO 8601) — מוצג בהודעה כ־מיום [יום] ה־DD.M */
  purchaseDate?: string | null;
  items?: DebtItem[] | null;
};
