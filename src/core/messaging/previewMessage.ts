/**
 * Render-only message preview.
 * payup_intro uses renderPayupIntroMessage, the same function as send.
 */

import { renderPayupIntroMessage } from "@/core/messaging/payupIntroTemplate";

const SUPPORTED_TEMPLATE = "payup_intro" as const;

export type PreviewMessageSuccess = {
  success: true;
  template: typeof SUPPORTED_TEMPLATE;
  message: string;
};

export type PreviewMessageFailure = {
  success: false;
  status: 400 | 422;
  code: string;
  error: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function requiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function previewMessage(body: unknown): PreviewMessageSuccess | PreviewMessageFailure {
  const record = asRecord(body);
  if (!record) {
    return { success: false, status: 400, code: "INVALID_BODY", error: "Request body must be a JSON object." };
  }

  const template = requiredText(record.template);
  if (!template) {
    return { success: false, status: 422, code: "TEMPLATE_REQUIRED", error: "template is required." };
  }
  if (template.trim() !== SUPPORTED_TEMPLATE) {
    return { success: false, status: 422, code: "UNSUPPORTED_TEMPLATE", error: "This template is not supported." };
  }

  const customerName = requiredText(record.customerName);
  if (!customerName) {
    return { success: false, status: 422, code: "CUSTOMER_NAME_REQUIRED", error: "customerName is required." };
  }

  const clinicDisplayName = requiredText(record.clinicDisplayName);
  if (!clinicDisplayName) {
    return {
      success: false,
      status: 422,
      code: "CLINIC_DISPLAY_NAME_REQUIRED",
      error: "clinicDisplayName is required.",
    };
  }

  return {
    success: true,
    template: SUPPORTED_TEMPLATE,
    message: renderPayupIntroMessage({ customerName, clinicDisplayName }),
  };
}
