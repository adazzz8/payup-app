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
  items?: DebtItem[] | null;
};
