import { randomUUID } from "crypto";
import { recordSmsFailure, recordSmsSuccess } from "@/core/diagnostics/smsState";
import type { SmsAttemptLogInput, SmsFailureStage } from "@/core/diagnostics/types";

const LOG_PREFIX = "[PayUp SMS]";

export function createSmsRequestId(): string {
  return randomUUID();
}

export function emitSmsAttemptLog(input: SmsAttemptLogInput): void {
  const base = {
    requestId: input.requestId,
    therapistId: input.therapistId ?? null,
    customerId: input.customerId ?? null,
    debtId: input.debtId ?? null,
    pipeline: input.pipeline,
  };

  if (input.outcome === "sent") {
    recordSmsSuccess(input.sid ?? null);
    console.info(LOG_PREFIX, {
      event: "SMS_SENT",
      ...base,
      success: true,
      sid: input.sid ?? null,
    });
    return;
  }

  const stage: SmsFailureStage = input.stage ?? "unknown";
  const errorCode = input.errorCode ?? "UNKNOWN";

  recordSmsFailure(stage, errorCode);

  console.warn(LOG_PREFIX, {
    event: "SMS_FAILED",
    ...base,
    success: false,
    stage,
    errorCode,
  });
}

export function smsAuthErrorCode(hasBearer: boolean): string {
  return hasBearer ? "TOKEN_INVALID" : "TOKEN_MISSING";
}
