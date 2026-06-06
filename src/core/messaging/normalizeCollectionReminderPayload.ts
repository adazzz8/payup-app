/**
 * Maps Base44 snake_case payload keys to the camelCase shape validatePayload expects.
 * Does not change business logic — key alignment only.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function pickBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

export function normalizeCollectionReminderPayload(raw: unknown): unknown {
  const payload = asRecord(raw);
  if (!payload) {
    return raw;
  }

  const business = asRecord(payload.business);
  const customer = asRecord(payload.customer);
  const debt = asRecord(payload.debt);
  const paymentMethodsRaw = payload.paymentMethods ?? payload.payment_methods;

  const normalized: Record<string, unknown> = { ...payload };

  if (business) {
    normalized.business = {
      ...business,
      businessName: pickString(business, "businessName", "business_name") ?? business.businessName,
    };
  }

  if (customer) {
    normalized.customer = {
      ...customer,
      fullName:
        pickString(customer, "fullName", "full_name", "name", "display_name") ?? customer.fullName,
      phone: pickString(customer, "phone", "phone_number", "phoneNumber") ?? customer.phone,
    };
  }

  if (debt) {
    normalized.debt = {
      ...debt,
      purchaseDate: debt.purchaseDate ?? debt.purchase_date,
    };
  }

  const paymentLink =
    pickString(payload, "paymentLink", "payment_link") ??
    (debt ? pickString(debt, "paymentLink", "payment_link") : undefined);
  if (paymentLink) {
    normalized.paymentLink = paymentLink;
  }

  const purchaseDateDisplay = pickString(payload, "purchaseDateDisplay", "purchase_date_display");
  if (purchaseDateDisplay) {
    normalized.purchaseDateDisplay = purchaseDateDisplay;
  }

  if (Array.isArray(paymentMethodsRaw)) {
    normalized.paymentMethods = paymentMethodsRaw.map((row) => {
      const method = asRecord(row);
      if (!method) {
        return row;
      }
      const isActive = pickBoolean(method, "isActive", "is_active");
      return {
        ...method,
        isActive: isActive ?? method.isActive,
      };
    });
  }

  return normalized;
}
