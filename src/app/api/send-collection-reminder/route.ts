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
import {
  CollectionMessageResolveError,
  resolveMessageTypeField,
} from "@/core/messaging/resolveCollectionPaymentMessage";
import type { PaymentMethodInput } from "@/core/payments/types";

const LOG_PREFIX = "[PayUp API][send-collection-reminder]";

type ApiBody = {
  debtId?: unknown;
  payload?: unknown;
  messageType?: unknown;
  message_type?: unknown;
};

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

function pickWrapperMessageType(body: ApiBody): string | undefined {
  if (isNonEmptyString(body.messageType)) return body.messageType.trim();
  if (isNonEmptyString(body.message_type)) return body.message_type.trim();
  return undefined;
}

/**
 * Prefer payload.messageType when present; otherwise use request-wrapper messageType.
 * Explicit unknown values are rejected (no silent fallback to first_payment_request).
 */
function applyMessageTypeToPayload(
  payload: BuildCollectionMessageInput,
  wrapperMessageType: string | undefined,
): { ok: true; payload: BuildCollectionMessageInput } | { ok: false; code: string; message: string } {
  const fromPayload =
    typeof payload.messageType === "string" && payload.messageType.trim().length > 0
      ? payload.messageType.trim()
      : undefined;
  const raw = fromPayload ?? wrapperMessageType;
  const resolution = resolveMessageTypeField(raw ?? null);

  if (resolution.status === "unknown") {
    return {
      ok: false,
      code: "UNKNOWN_MESSAGE_TYPE",
      message: `Unknown messageType "${resolution.raw}". SMS was not sent.`,
    };
  }

  return {
    ok: true,
    payload: {
      ...payload,
      messageType: resolution.messageType,
    },
  };
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
  } catch {
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
  const wrapperMessageType = pickWrapperMessageType(body);

  if (body.payload !== undefined) {
    const normalizedPayload = normalizeCollectionReminderPayload(body.payload);
    if (!validatePayload(normalizedPayload, input.debtId)) {
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

    const withType = applyMessageTypeToPayload(
      normalizedPayload as BuildCollectionMessageInput,
      wrapperMessageType,
    );
    if (!withType.ok) {
      pipeline.push("PAYLOAD FAILED");
      emitSmsAttemptLog({
        requestId,
        outcome: "failed",
        therapistId: auth.context.userId,
        debtId: input.debtId,
        customerId: (normalizedPayload as BuildCollectionMessageInput).customer?.id,
        stage: "payload_validation",
        errorCode: withType.code,
        pipeline,
      });
      return jsonWithCors(
        request,
        {
          error: withType.message,
          code: withType.code,
          details: [{ field: "messageType", message: withType.message }],
        },
        422,
      );
    }

    input = { debtId: input.debtId, payload: withType.payload };
  } else if (wrapperMessageType) {
    // debtId-only path with explicit wrapper type — still reject unknown types early
    const resolution = resolveMessageTypeField(wrapperMessageType);
    if (resolution.status === "unknown") {
      pipeline.push("PAYLOAD FAILED");
      emitSmsAttemptLog({
        requestId,
        outcome: "failed",
        therapistId: auth.context.userId,
        debtId: input.debtId,
        stage: "payload_validation",
        errorCode: "UNKNOWN_MESSAGE_TYPE",
        pipeline,
      });
      return jsonWithCors(
        request,
        {
          error: `Unknown messageType "${resolution.raw}". SMS was not sent.`,
          code: "UNKNOWN_MESSAGE_TYPE",
          details: [{ field: "messageType", message: "Unrecognized messageType" }],
        },
        422,
      );
    }
  }

  pipeline.push("PAYLOAD OK");

  const customerId = extractCustomerId(input.payload);

  try {
    const result = await sendCollectionReminder(input);

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
    if (err instanceof CollectionMessageResolveError) {
      pipeline.push("PAYLOAD FAILED");
      emitSmsAttemptLog({
        requestId,
        outcome: "failed",
        therapistId: auth.context.userId,
        customerId,
        debtId: input.debtId,
        stage: "payload_validation",
        errorCode: err.code,
        pipeline,
      });
      return jsonWithCors(
        request,
        {
          error: err.message,
          code: err.code,
          details: [{ field: "payload", message: err.message }],
        },
        422,
      );
    }

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
