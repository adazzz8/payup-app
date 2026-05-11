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
  /**
   * Full https payment URL from Base44 — same URL the customer opens (unique per debt/customer).
   * Example: https://getpayup.io/pay/abc123 — never token-only; Core does not build links.
   */
  paymentLink: string;
  /** Optional pre-formatted date fragment, e.g. "שלישי ה-7.5" (without leading "מיום "). */
  purchaseDateDisplay?: string | null;
};

export type BuildCollectionMessageOutput = {
  messageText: string;
  whatsappUrl: string | null;
  metadata: {
    includedPaymentMethods: NormalizedPaymentMethod[];
    includesItems: boolean;
    includesAmount: boolean;
    includesPurchaseDate: boolean;
    resolvedPaymentLink: string;
  };
};
