import { normalizeCollectionReminderPayload } from "@/core/messaging/normalizeCollectionReminderPayload";
import { resolveMessageTypeField } from "@/core/messaging/resolveCollectionPaymentMessage";

export type PayupIntroRequestContext = {
  businessId: string;
  customerId: string;
  customerName: string;
  clinicDisplayName: string;
  phone: string;
};

export type PayupIntroRequestRead =
  | { kind: "not_intro" }
  | { kind: "invalid"; code: string; message: string; field: string }
  | { kind: "ready"; context: PayupIntroRequestContext };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Preview-only placeholder. A real send must not persist this id. */
export function isPreviewOnlyCustomerId(customerId: string): boolean {
  return customerId.trim().toLowerCase() === "preview";
}

export function readPayupIntroRequest(body: {
  payload?: unknown;
  messageType?: unknown;
  message_type?: unknown;
  clinicDisplayName?: unknown;
  clinic_display_name?: unknown;
}): PayupIntroRequestRead {
  const wrapperType = nonEmpty(body.messageType) ?? nonEmpty(body.message_type);
  const normalized = body.payload === undefined ? null : asRecord(normalizeCollectionReminderPayload(body.payload));
  const payloadType = normalized ? nonEmpty(normalized.messageType) : null;
  const resolution = resolveMessageTypeField(payloadType ?? wrapperType ?? null);

  if (resolution.status !== "known" || resolution.messageType !== "payup_intro") {
    return { kind: "not_intro" };
  }

  if (!normalized) {
    return {
      kind: "invalid",
      code: "INVALID_PAYLOAD",
      field: "payload",
      message: "payup_intro requires a payload with customer, business, and clinicDisplayName.",
    };
  }

  const business = asRecord(normalized.business);
  const customer = asRecord(normalized.customer);
  const businessId = business ? nonEmpty(business.id) : null;
  const customerId = customer ? nonEmpty(customer.id) : null;
  const customerName = customer ? nonEmpty(customer.fullName) ?? nonEmpty(customer.name) : null;
  const phone = customer ? nonEmpty(customer.phone) : null;
  const clinicDisplayName =
    nonEmpty(normalized.clinicDisplayName) ??
    nonEmpty(body.clinicDisplayName) ??
    nonEmpty(body.clinic_display_name);

  if (!businessId) {
    return { kind: "invalid", code: "BUSINESS_ID_REQUIRED", field: "business.id", message: "business.id is required." };
  }
  if (!customerId) {
    return { kind: "invalid", code: "CUSTOMER_ID_REQUIRED", field: "customer.id", message: "customer.id is required." };
  }
  if (!customerName) {
    return {
      kind: "invalid",
      code: "CUSTOMER_NAME_REQUIRED",
      field: "customer.fullName",
      message: "customer.fullName is required.",
    };
  }
  if (!clinicDisplayName) {
    return {
      kind: "invalid",
      code: "CLINIC_DISPLAY_NAME_REQUIRED",
      field: "clinicDisplayName",
      message: "clinicDisplayName is required.",
    };
  }
  if (!phone) {
    return { kind: "invalid", code: "PHONE_REQUIRED", field: "customer.phone", message: "customer.phone is required." };
  }

  return {
    kind: "ready",
    context: { businessId, customerId, customerName, clinicDisplayName, phone },
  };
}
