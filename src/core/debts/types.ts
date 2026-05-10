export type DebtItem = {
  productName: string;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

export type DebtContext = {
  id: string;
  totalAmount?: number | null;
  currency?: "ILS" | string | null;
  /** תאריך/זמן הקנייה (ISO 8601) — מוצג בהודעה כ־מיום [יום] ה־DD.M */
  purchaseDate?: string | null;
  items?: DebtItem[] | null;
};
