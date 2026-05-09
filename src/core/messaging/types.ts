import type { BusinessContext } from "@/core/businesses/types";
import type { DebtContext } from "@/core/debts/types";
import type { NormalizedPaymentMethod, PaymentMethodInput } from "@/core/payments/types";

export type CustomerContext = {
  id: string;
  fullName?: string | null;
  phone?: string | null;
};

export type BuildCollectionMessageInput = {
  business: BusinessContext;
  customer: CustomerContext;
  debt: DebtContext;
  paymentMethods: PaymentMethodInput[];
};

export type BuildCollectionMessageOutput = {
  messageText: string;
  whatsappUrl: string | null;
  metadata: {
    includedPaymentMethods: NormalizedPaymentMethod[];
    includesItems: boolean;
    includesAmount: boolean;
  };
};
