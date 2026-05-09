export type PaymentMethodType = "bit" | "paybox" | "credit_link" | "bank_transfer" | "cash";

export type PaymentMethodInput = {
  type: PaymentMethodType;
  isActive: boolean;
  value?: string | null;
};

export type NormalizedPaymentMethod = {
  type: PaymentMethodType;
  label: string;
  value?: string;
};
