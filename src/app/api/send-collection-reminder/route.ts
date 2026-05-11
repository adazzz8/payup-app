import { NextResponse } from "next/server";
import { sendCollectionReminder } from "@/core/reminders/sendCollectionReminder";
import type { SendCollectionReminderInput } from "@/core/reminders/sendCollectionReminder";
import type { BuildCollectionMessageInput } from "@/core/messaging/types";
import type { PaymentMethodInput } from "@/core/payments/types";

/** Temporary debugging — remove when Base44 ↔ Core integration is stable */
const LOG_PREFIX = "[PayUp API][send-collection-reminder]";

/** Inspect-only: log which purchase-date fields exist on the raw incoming payload (no behavior change). */
function logIncomingPurchaseDateFields(payload: unknown): void {
  if (payload === undefined) {
    console.info(`${LOG_PREFIX} purchase-date fields (incoming)`, {
      note: "body.payload is undefined - no nested purchase-date paths to inspect",
    });
    return;
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    console.info(`${LOG_PREFIX} purchase-date fields (incoming)`, {
      note: "body.payload is not a plain object",
      payloadType: payload === null ? "null" : Array.isArray(payload) ? "array" : typeof payload,
    });
    return;
  }
  const p = payload as Record<string, unknown>;
  const debt = p.debt;
  const debtObj =
    debt && typeof debt === "object" && !Array.isArray(debt)
      ? (debt as Record<string, unknown>)
      : null;

  const inspectPath = (exists: boolean, value: unknown) => {
    const type = exists ? typeof value : "undefined";
    let parsesAsJsDate: boolean | null = null;
    if (exists && typeof value === "string") {
      const t = new Date(value.trim()).getTime();
      parsesAsJsDate = !Number.isNaN(t);
    }
    return {
      exists,
      value: exists ? value : undefined,
      type,
      parsesAsJsDate,
    };
  };

  console.info(`${LOG_PREFIX} purchase-date fields (incoming)`, {
    "payload.purchaseDateDisplay": inspectPath("purchaseDateDisplay" in p, p.purchaseDateDisplay),
    "payload.debt.purchaseDate": inspectPath(
      debtObj !== null && "purchaseDate" in debtObj,
      debtObj?.purchaseDate,
    ),
    "payload.debt.created_date": inspectPath(
      debtObj !== null && "created_date" in debtObj,
      debtObj?.created_date,
    ),
  });
}

/**
 * Production contract: Base44 MUST send `payload.paymentLink` — full https URL from the pay flow
 * (not optional). Validation rejects missing or non-https links so SMS never ships without a real link.
 */

const CORS_ALLOWED_ORIGIN = "https://getpayup.io";

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": CORS_ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
    Vary: "Origin",
  };
}

function jsonWithCors(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: getCorsHeaders() });
}

/** Preflight for browser fetch from Base44 (getpayup.io) */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(),
      "Access-Control-Max-Age": "86400",
    },
  });
}

type ApiBody = {
  debtId?: unknown;
  payload?: unknown;
};

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

export async function POST(request: Request) {
  let body: ApiBody;
  try {
    body = (await request.json()) as ApiBody;
    logIncomingPurchaseDateFields(body.payload);
    console.info(`${LOG_PREFIX} incoming body`, JSON.stringify(body));
  } catch (parseError) {
    console.warn(`${LOG_PREFIX} validation failed: invalid JSON`, parseError);
    return jsonWithCors({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const debtId = body.debtId;

  if (!isNonEmptyString(debtId)) {
    console.warn(`${LOG_PREFIX} validation failed: DEBT_ID_REQUIRED`, {
      receivedDebtId: body.debtId,
      typeOfDebtId: typeof body.debtId,
    });
    return jsonWithCors(
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
    if (!validatePayload(body.payload, input.debtId)) {
      console.warn(`${LOG_PREFIX} validation failed: INVALID_PAYLOAD`, {
        debtId: input.debtId,
        payloadPreview:
          body.payload && typeof body.payload === "object"
            ? JSON.stringify(body.payload).slice(0, 2000)
            : body.payload,
      });
      return jsonWithCors(
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
    input = { debtId: input.debtId, payload: body.payload };
  }

  try {
    console.info(`${LOG_PREFIX} calling sendCollectionReminder`, JSON.stringify(input));

    const result = await sendCollectionReminder(input);

    console.info(`${LOG_PREFIX} Twilio / delivery result`, {
      success: result.success,
      provider: result.provider,
      sid: result.sid,
      deliveryStatus: result.deliveryStatus,
      error: result.error,
      messageTextLength: result.messageText?.length ?? 0,
    });

    if (result.success) {
      return jsonWithCors(result, 200);
    }

    return jsonWithCors(result, 502);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`${LOG_PREFIX} thrown error:`, message);
    if (err instanceof Error && err.stack) {
      console.error(`${LOG_PREFIX} stack:\n`, err.stack);
    } else {
      console.error(`${LOG_PREFIX} raw error:`, err);
    }
    return jsonWithCors({ error: message, code: "INTERNAL_ERROR" }, 500);
  }
}
