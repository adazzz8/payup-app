import { checkAuthExchangePrerequisites, checkJwtConfig } from "@/core/diagnostics/healthChecks";
import { requireAdminAuth } from "@/core/diagnostics/requireAdminAuth";
import { createSmsRequestId, emitSmsAttemptLog } from "@/core/diagnostics/smsAttemptLog";
import type { SmsFailureStage } from "@/core/diagnostics/types";
import { sendCollectionReminder } from "@/core/reminders/sendCollectionReminder";
import type { BuildCollectionMessageInput } from "@/core/messaging/types";

type TestSmsBody = {
  phone?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveTestPaymentLink(): string | null {
  const candidates = [process.env.PAYUP_FAKE_PAYMENT_LINK, process.env.PAYUP_TEST_PAYMENT_LINK];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && /^https:\/\//i.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

function buildDiagnosticSmsPayload(phone: string): BuildCollectionMessageInput | { stage: SmsFailureStage; reason: string } {
  const paymentLink = resolveTestPaymentLink();
  if (!paymentLink) {
    return {
      stage: "payload_validation",
      reason: "Set PAYUP_FAKE_PAYMENT_LINK or PAYUP_TEST_PAYMENT_LINK (full https URL) on Railway",
    };
  }

  const debtId = "diag_sms_test";

  return {
    business: {
      id: "diag_business",
      businessName: "PayUp Diagnostics",
    },
    customer: {
      id: "diag_customer",
      fullName: "PayUp Diagnostics",
      phone: phone.trim(),
    },
    debt: {
      id: debtId,
      totalAmount: 1,
      currency: "ILS",
      items: [],
    },
    paymentMethods: [{ type: "bit", isActive: true, value: "0500000000" }],
    paymentLink,
  };
}

export async function POST(request: Request) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const requestId = createSmsRequestId();
  const pipeline: string[] = ["SMS START"];

  const jwtHealth = checkJwtConfig();
  if (jwtHealth.status === "error") {
    pipeline.push("JWT FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      stage: "jwt",
      errorCode: jwtHealth.error ?? "JWT_CONFIG_ERROR",
      pipeline,
    });
    return Response.json({ success: false, stage: "jwt", reason: jwtHealth.error }, { status: 503 });
  }
  pipeline.push("JWT OK");

  const exchangeHealth = checkAuthExchangePrerequisites();
  if (exchangeHealth.status === "error") {
    pipeline.push("AUTH EXCHANGE FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      stage: "auth_exchange",
      errorCode: exchangeHealth.error ?? "AUTH_EXCHANGE_CONFIG_ERROR",
      pipeline,
    });
    return Response.json(
      { success: false, stage: "auth_exchange", reason: exchangeHealth.error },
      { status: 503 },
    );
  }
  pipeline.push("AUTH EXCHANGE OK");

  let body: TestSmsBody;
  try {
    body = (await request.json()) as TestSmsBody;
  } catch {
    pipeline.push("PAYLOAD FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      stage: "payload_validation",
      errorCode: "INVALID_JSON",
      pipeline,
    });
    return Response.json({ success: false, stage: "payload_validation", reason: "Invalid JSON body" }, { status: 400 });
  }

  if (!isNonEmptyString(body.phone)) {
    pipeline.push("PAYLOAD FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      stage: "payload_validation",
      errorCode: "PHONE_REQUIRED",
      pipeline,
    });
    return Response.json({ success: false, stage: "payload_validation", reason: "phone is required" }, { status: 422 });
  }

  const payloadResult = buildDiagnosticSmsPayload(body.phone);
  if ("stage" in payloadResult) {
    pipeline.push("PAYLOAD FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      stage: payloadResult.stage,
      errorCode: "PAYMENT_LINK_NOT_CONFIGURED",
      pipeline,
    });
    return Response.json(
      { success: false, stage: payloadResult.stage, reason: payloadResult.reason },
      { status: 422 },
    );
  }
  pipeline.push("PAYLOAD OK");

  const debtId = payloadResult.debt.id;

  try {
    const result = await sendCollectionReminder({
      debtId,
      payload: payloadResult,
    });

    if (result.success) {
      pipeline.push("TWILIO OK", "SMS SENT");
      emitSmsAttemptLog({
        requestId,
        outcome: "sent",
        customerId: payloadResult.customer.id,
        debtId,
        sid: result.sid,
        pipeline,
      });
      return Response.json({ success: true, sid: result.sid, requestId });
    }

    pipeline.push("TWILIO FAILED");
    const errorCode = result.error ?? "TWILIO_SEND_FAILED";
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      customerId: payloadResult.customer.id,
      debtId,
      stage: "twilio",
      errorCode,
      pipeline,
    });
    return Response.json({ success: false, stage: "twilio", reason: errorCode, requestId }, { status: 502 });
  } catch {
    pipeline.push("RAILWAY FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      customerId: payloadResult.customer.id,
      debtId,
      stage: "railway",
      errorCode: "INTERNAL_ERROR",
      pipeline,
    });
    console.error("[PayUp Admin][test-sms] failed", {
      requestId,
      customerId: payloadResult.customer.id,
      debtId,
      success: false,
      stage: "railway",
      errorCode: "INTERNAL_ERROR",
    });
    return Response.json({ success: false, stage: "railway", reason: "Internal server error", requestId }, { status: 500 });
  }
}
