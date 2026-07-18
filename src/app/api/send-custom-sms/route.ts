import { requireAuth } from "@/core/auth/requireAuth";
import {
  createSmsRequestId,
  emitSmsAttemptLog,
  smsAuthErrorCode,
} from "@/core/diagnostics/smsAttemptLog";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";
import { sendCustomSms } from "@/core/messaging/sendCustomSms";

const LOG_PREFIX = "[PayUp API][send-custom-sms]";

type ApiBody = {
  phone?: unknown;
  messageText?: unknown;
  businessId?: unknown;
  externalId?: unknown;
};

/** Preflight for browser fetch from Base44 */
export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204, { "Access-Control-Max-Age": "86400" });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

  const details: { field: string; message: string }[] = [];
  if (!isNonEmptyString(body.phone)) {
    details.push({ field: "phone", message: "Non-empty string required" });
  }
  if (!isNonEmptyString(body.messageText)) {
    details.push({ field: "messageText", message: "Non-empty string required" });
  }
  if (!isNonEmptyString(body.businessId)) {
    details.push({ field: "businessId", message: "Non-empty string required" });
  }
  if (
    body.externalId !== undefined &&
    body.externalId !== null &&
    typeof body.externalId !== "string"
  ) {
    details.push({ field: "externalId", message: "Must be a string when provided" });
  }

  if (details.length > 0) {
    pipeline.push("PAYLOAD FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      therapistId: auth.context.userId,
      stage: "payload_validation",
      errorCode: "INVALID_PAYLOAD",
      pipeline,
    });
    return jsonWithCors(
      request,
      {
        error: "Validation failed",
        code: "INVALID_PAYLOAD",
        details,
      },
      422,
    );
  }

  pipeline.push("PAYLOAD OK");

  const phone = (body.phone as string).trim();
  const messageText = (body.messageText as string).trim();
  const businessId = (body.businessId as string).trim();
  const externalId =
    typeof body.externalId === "string" && body.externalId.trim().length > 0
      ? body.externalId.trim()
      : null;

  try {
    const result = await sendCustomSms({
      phone,
      messageText,
      businessId,
      externalId,
    });

    if (result.success) {
      pipeline.push("TWILIO OK", "SMS SENT");
      emitSmsAttemptLog({
        requestId,
        outcome: "sent",
        therapistId: auth.context.userId,
        sid: result.sid,
        pipeline,
      });
      return jsonWithCors(
        request,
        {
          success: result.success,
          deliveryStatus: result.deliveryStatus,
          provider: result.provider,
          sid: result.sid,
        },
        200,
      );
    }

    pipeline.push("TWILIO FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      therapistId: auth.context.userId,
      stage: "twilio",
      errorCode: result.error ?? "TWILIO_SEND_FAILED",
      pipeline,
    });
    return jsonWithCors(
      request,
      {
        success: false,
        deliveryStatus: result.deliveryStatus,
        provider: result.provider,
        sid: result.sid,
        error: result.error ?? "Twilio SMS sending failed.",
        code: "TWILIO_SEND_FAILED",
      },
      502,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    pipeline.push("RAILWAY FAILED");
    emitSmsAttemptLog({
      requestId,
      outcome: "failed",
      therapistId: auth.context.userId,
      stage: "railway",
      errorCode: "INTERNAL_ERROR",
      pipeline,
    });
    console.error(`${LOG_PREFIX} failed`, {
      requestId,
      therapistId: auth.context.userId,
      businessId,
      success: false,
      stage: "railway",
      errorCode: "INTERNAL_ERROR",
    });
    return jsonWithCors(request, { error: message, code: "INTERNAL_ERROR" }, 500);
  }
}
