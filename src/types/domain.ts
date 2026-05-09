export type DebtStatus =
  | "draft"
  | "ready_to_send"
  | "sent"
  | "waiting_payment"
  | "customer_said_today"
  | "customer_said_week"
  | "customer_claimed_paid"
  | "paid_confirmed"
  | "overdue"
  | "cancelled"
  | "needs_receipt"
  | "receipt_sent";

export type DebtSource = "manual" | "quick_add" | "self_checkout";

export type Debt = {
  id: string;
  ownerId: string;
  businessId: string | null;
  customerId: string;
  productId: string | null;
  checkoutSubmissionId: string | null;
  source: DebtSource;
  description: string;
  originalAmount: number;
  outstandingAmount: number;
  currency: string;
  status: DebtStatus;
  isQuickAdd: boolean;
  sendAfterReview: boolean;
  customerClaimedPaymentMethod: string | null;
  customerClaimedPaidAt: string | null;
  ownerConfirmedPaidAt: string | null;
  receiptRequired: boolean;
  invoiceRequired: boolean;
  invoiceUploadedAt: string | null;
  invoiceFileUrl: string | null;
  lastMessageAt: string | null;
  reminderCount: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptStatus = "pending_upload" | "uploaded" | "sent" | "not_required";

export type Business = {
  id: string;
  ownerId: string;
  publicSlug: string;
  qrToken: string;
  businessName: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  themePrimaryColor: string;
  themeSecondaryColor: string;
  publicEnabled: boolean;
  qrEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CheckoutSession = {
  id: string;
  businessId: string;
  slugSnapshot: string | null;
  source: string;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: string;
};

export type CheckoutSubmission = {
  id: string;
  businessId: string;
  checkoutSessionId: string | null;
  customerId: string | null;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  totalAmount: number | null;
  status: string;
  rawPayload: Record<string, unknown>;
  createdAt: string;
};

export type CheckoutSubmissionItem = {
  id: string;
  submissionId: string;
  productId: string | null;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  createdAt: string;
};

export type Customer = {
  id: string;
  ownerId: string;
  fullName: string;
  phone: string | null;
  activeDebtCount: number;
  totalOutstanding: number;
  createdAt: string;
};
