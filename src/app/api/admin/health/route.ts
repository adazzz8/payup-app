import { getSmsStateSnapshot } from "@/core/diagnostics/smsState";
import { runHealthChecks } from "@/core/diagnostics/healthChecks";
import { requireAdminAuth } from "@/core/diagnostics/requireAdminAuth";
import { getDeploymentInfo } from "@/core/diagnostics/version";

export async function GET(request: Request) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const checks = await runHealthChecks();
  const smsState = getSmsStateSnapshot();
  const deployment = getDeploymentInfo();

  const body = {
    status: checks.overall,
    jwt: checks.jwt.status,
    supabase: checks.supabase.status,
    authExchange: checks.authExchange.status,
    twilio: checks.twilio.status,
    lastSuccessfulSms: smsState.lastSuccessfulSms,
    lastFailedSms: smsState.lastFailedSms,
    lastFailureReason: smsState.lastFailureReason,
    lastFailureStage: smsState.lastFailureStage,
    lastTwilioSid: smsState.lastTwilioSid,
    version: deployment.version,
    gitCommit: deployment.gitCommit,
    buildTimestamp: deployment.buildTimestamp,
    nodeVersion: deployment.nodeVersion,
    timestamp: new Date().toISOString(),
    ...(checks.overall === "degraded" && checks.error ? { error: checks.error } : {}),
  };

  return Response.json(body, { status: checks.overall === "ok" ? 200 : 503 });
}
