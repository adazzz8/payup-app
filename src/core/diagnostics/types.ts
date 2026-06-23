export type DiagnosticStatus = "ok" | "error";

export type SmsFailureStage =
  | "jwt"
  | "auth_exchange"
  | "payload_validation"
  | "railway"
  | "twilio"
  | "unknown";

export type SmsAttemptOutcome = "sent" | "failed";

export type SmsAttemptLogInput = {
  requestId: string;
  outcome: SmsAttemptOutcome;
  therapistId?: string;
  customerId?: string;
  debtId?: string;
  stage?: SmsFailureStage;
  errorCode?: string;
  sid?: string | null;
  pipeline: string[];
};

export type SmsStateSnapshot = {
  lastSuccessfulSms: string | null;
  lastFailedSms: string | null;
  lastFailureReason: string | null;
  lastFailureStage: SmsFailureStage | null;
  lastTwilioSid: string | null;
};

export type DeploymentInfo = {
  gitCommit: string;
  buildTimestamp: string;
  nodeVersion: string;
  version: string;
};

export type ComponentHealth = {
  status: DiagnosticStatus;
  error?: string;
};
