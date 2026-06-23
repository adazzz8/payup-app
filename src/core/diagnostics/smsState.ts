import type { SmsFailureStage, SmsStateSnapshot } from "@/core/diagnostics/types";

const smsState: SmsStateSnapshot = {
  lastSuccessfulSms: null,
  lastFailedSms: null,
  lastFailureReason: null,
  lastFailureStage: null,
  lastTwilioSid: null,
};

export function getSmsStateSnapshot(): SmsStateSnapshot {
  return { ...smsState };
}

export function recordSmsSuccess(sid: string | null, at: Date = new Date()): void {
  smsState.lastSuccessfulSms = at.toISOString();
  smsState.lastTwilioSid = sid;
}

export function recordSmsFailure(stage: SmsFailureStage, reason: string, at: Date = new Date()): void {
  smsState.lastFailedSms = at.toISOString();
  smsState.lastFailureReason = reason;
  smsState.lastFailureStage = stage;
}
