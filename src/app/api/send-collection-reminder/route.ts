import { requireAuth } from "@/core/auth/requireAuth";
import {
  createSmsRequestId,
  emitSmsAttemptLog,
  smsAuthErrorCode,
} from "@/core/diagnostics/smsAttemptLog";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";
import { sendCollectionReminder } from "@/core/reminders/sendCollectionReminder";
import type { SendCollectionReminderInput } from "@/core/reminders/sendCollectionReminder";
import type { BuildCollectionMessageInput } from "@/core/messaging/types";
import { normalizeCollectionReminderPayload } from "@/core/messaging/normalizeCollectionReminderPayload";
import type { PaymentMethodInput } from "@/core/payments/types";

const LOG_PREFIX = "[PayUp API][send-collection-reminder]";

type ApiBody = {
  debtId?: unknown;
  payload?: unknown;
};

function extractDebtIdFromBody(body: ApiBody): string | undefined {
  return typeof body.debtId === "string" && body.debtId.trim().length > 0 ? body.debtId.trim() : undefined;
}

function extractCustomerIdFromUnknownPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  const customer = (payload as Record<string, unknown>).customer;
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return undefined;
  }
  const id = (customer as Record<string, unknown>).id;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : undefined;
}

/**
 * Production contract: Base44 MUST send `payload.paymentLink` — full https URL from the pay flow
 * (not optional). Validation rejects missing or non-https links so SMS never ships without a real link.
 */

/** Preflight for browser fetch from Base44 */
export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204, { "Access-Control-Max-Age": "86400" });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validatePaymentMethods(input: unknown): input is PaymentMethodInput[] {
  if (!Array.isArray(input)) return false;
  const allowed = new Set(["bit", "paybox", "credit_link", "bank_transfer", "cash"]);
  return input.every(
    (row) =>
      row &&
      typeof row === "object" &&
      allowed.has(String((row as PaymentMethodInput).type)) &&
      typeof (row as PaymentMethodInput).isActive === "boolean",
  );
}

function validatePayload(payload: unknown, debtId: string): payload is BuildCollectionMessageInput {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;

  const business = p.business;
  const customer = p.customer;
  const debt = p.debt;
  const paymentMethods = p.paymentMethods;

  if (
    !business ||
    typeof business !== "object" ||
    !isNonEmptyString((business as Record<string, unknown>).id) ||
    !isNonEmptyString((business as Record<string, unknown>).businessName)
  ) {
    return false;
  }

  if (
    !customer ||
    typeof customer !== "object" ||
    !isNonEmptyString((customer as Record<string, unknown>).id) ||
    !isNonEmptyString((customer as Record<string, unknown>).phone)
  ) {
    return false;
  }

  if (!debt || typeof debt !== "object" || !isNonEmptyString((debt as Record<string, unknown>).id)) {
    return false;
  }

  if ((debt as Record<string, unknown>).id !== debtId) {
    return false;
  }

  if (!validatePaymentMethods(paymentMethods)) {
    return false;
  }

  const paymentLink = p.paymentLink;
  if (!isNonEmptyString(paymentLink)) {
    return false;
  }
  const trimmedLink = paymentLink.trim();
  if (!/^https:\/\//i.test(trimmedLink)) {
    return false;
  }

  const purchaseDateDisplay = p.purchaseDateDisplay;
  if (purchaseDateDisplay !== undefined && purchaseDateDisplay !== null && typeof purchaseDateDisplay !== "string") {
    return false;
  }

  return true;
}

function extractCustomerId(payload: BuildCollectionMessageInput | undefined): string | undefined {
  return payload?.customer?.id;
}

export async function POST(request: Request) {
  const requestId = createSmsRequestId();
  const pipeline: string[] = ["SMS START"];

  const auth = requireAuth(request);
  if (!auth.ok) {
    const hasBearer = Boolean(request.headers.get("Authorization")?.startsWith("Bearer "));
    pipeline.push("JWT FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      stage: "jwt",
      errorCode: smsAuthErrorCode(hasBearer),
      pipeline,
    });
    return auth.response;
  }
  pipeline.push("JWT OK");

  let body: ApiBody;
  try {
    body = (await request.json()) as ApiBody;
    console.info(`${LOG_PREFIX} request received`, {
      requestId,
      therapistId: auth.context.userId,
      debtId: extractDebtIdFromBody(body),
      customerId: extractCustomerIdFromUnknownPayload(body.payload),
      hasPayload: body.payload !== undefined,
    });
  } catch {
    console.warn(`${LOG_PREFIX} validation failed`, {
      requestId,
      therapistId: auth.context.userId,
      success: false,
      errorCode: "INVALID_JSON",
    });
    pipeline.push("PAYLOAD FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      therapistId: auth.context.userId,
      stage: "payload_validation",
      errorCode: "INVALID_JSON",
      pipeline,
    });
    return jsonWithCors(request, { error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const debtId = body.debtId;

  if (!isNonEmptyString(debtId)) {
    console.warn(`${LOG_PREFIX} validation failed`, {
      requestId,
      therapistId: auth.context.userId,
      success: false,
      errorCode: "DEBT_ID_REQUIRED",
    });
    pipeline.push("PAYLOAD FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      therapistId: auth.context.userId,
      stage: "payload_validation",
      errorCode: "DEBT_ID_REQUIRED",
      pipeline,
    });
    return jsonWithCors(
      request,
      {
        error: "Validation failed",
        code: "DEBT_ID_REQUIRED",
        details: [{ field: "debtId", message: "Non-empty string required" }],
      },
      422,
    );
  }

  let input: SendCollectionReminderInput = { debtId: debtId.trim() };

  if (body.payload !== undefined) {
    const normalizedPayload = normalizeCollectionReminderPayload(body.payload);
    if (!validatePayload(normalizedPayload, input.debtId)) {
      console.warn(`${LOG_PREFIX} validation failed`, {
        requestId,
        therapistId: auth.context.userId,
        debtId: input.debtId,
        customerId:
          normalizedPayload && typeof normalizedPayload === "object"
            ? ((normalizedPayload as BuildCollectionMessageInput).customer?.id ?? undefined)
            : undefined,
        success: false,
        errorCode: "INVALID_PAYLOAD",
      });
      pipeline.push("PAYLOAD FAILED");
      emitSmsAttemptLog({
        requestId,
        outcome: "failed",
        therapistId: auth.context.userId,
        debtId: input.debtId,
        customerId:
          normalizedPayload && typeof normalizedPayload === "object"
            ? ((normalizedPayload as BuildCollectionMessageInput).customer?.id ?? undefined)
            : undefined,
        stage: "payload_validation",
        errorCode: "INVALID_PAYLOAD",
        pipeline,
      });
      return jsonWithCors(
        request,
        {
          error: "Validation failed",
          code: "INVALID_PAYLOAD",
          details: [
            {
              field: "payload",
              message:
                "Base44 production payloads MUST include paymentLink (full https URL from your pay flow). Also: business, customer, debt (id matching debtId), paymentMethods.",
            },
          ],
        },
        422,
      );
    }
    input = { debtId: input.debtId, payload: normalizedPayload as BuildCollectionMessageInput };
  }

  pipeline.push("PAYLOAD OK");

  const customerId = extractCustomerId(input.payload);

  try {
    console.info(`${LOG_PREFIX} sending`, {
      requestId,
      therapistId: auth.context.userId,
      customerId,
      debtId: input.debtId,
    });

    const result = await sendCollectionReminder(input);

    console.info(`${LOG_PREFIX} delivery result`, {
      requestId,
      therapistId: auth.context.userId,
      customerId,
      debtId: input.debtId,
      success: result.success,
      sid: result.sid,
      errorCode: result.success ? null : result.error,
    });

    if (result.success) {
      pipeline.push("TWILIO OK", "SMS SENT");
      emitSmsAttemptLog({
        requestId,
        outcome: "sent",
        therapistId: auth.context.userId,
        customerId,
        debtId: input.debtId,
        sid: result.sid,
        pipeline,
      });
      return jsonWithCors(request, result, 200);
    }

    pipeline.push("TWILIO FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      therapistId: auth.context.userId,
      customerId,
      debtId: input.debtId,
      stage: "twilio",
      errorCode: result.error ?? "TWILIO_SEND_FAILED",
      pipeline,
    });
    return jsonWithCors(request, result, 502);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    pipeline.push("RAILWAY FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      therapistId: auth.context.userId,
      customerId,
      debtId: input.debtId,
      stage: "railway",
      errorCode: "INTERNAL_ERROR",
      pipeline,
    });
    console.error(`${LOG_PREFIX} failed`, {
      requestId,
      therapistId: auth.context.userId,
      customerId,
      debtId: input.debtId,
      success: false,
      stage: "railway",
      errorCode: "INTERNAL_ERROR",
    });
    return jsonWithCors(request, { error: message, code: "INTERNAL_ERROR" }, 500);
  }
}
