import { mintAccessToken, verifyAccessToken } from "@/core/auth/jwt";
import type { ComponentHealth } from "@/core/diagnostics/types";
import { createTwilioClient } from "@/core/providers/twilio/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function checkJwtConfig(): ComponentHealth {
  const secret = process.env.PAYUP_JWT_SECRET?.trim();
  if (!secret) {
    return { status: "error", error: "PAYUP_JWT_SECRET is not configured" };
  }

  try {
    const { token } = mintAccessToken("health-check");
    const claims = verifyAccessToken(token);
    if (!claims) {
      return { status: "error", error: "JWT mint/verify self-check failed" };
    }
    return { status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "JWT check failed";
    return { status: "error", error: message };
  }
}

export async function checkSupabaseConnectivity(): Promise<ComponentHealth> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("therapist_accounts").select("id").limit(1);
    if (error) {
      return { status: "error", error: error.message };
    }
    return { status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Supabase check failed";
    return { status: "error", error: message };
  }
}

export function checkAuthExchangePrerequisites(): ComponentHealth {
  const serviceKey = process.env.BASE44_SERVICE_API_KEY?.trim();
  if (!serviceKey) {
    return { status: "error", error: "BASE44_SERVICE_API_KEY is not configured" };
  }

  const jwt = checkJwtConfig();
  if (jwt.status === "error") {
    return jwt;
  }

  return { status: "ok" };
}

export async function checkTwilioCredentials(): Promise<ComponentHealth> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromPhone = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !fromPhone) {
    return { status: "error", error: "Twilio environment variables are missing" };
  }

  try {
    const { client } = createTwilioClient();
    await client.api.accounts(accountSid).fetch();
    return { status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Twilio check failed";
    return { status: "error", error: message };
  }
}

export async function runHealthChecks(): Promise<{
  jwt: ComponentHealth;
  supabase: ComponentHealth;
  authExchange: ComponentHealth;
  twilio: ComponentHealth;
  overall: "ok" | "degraded";
  error?: string;
}> {
  const jwt = checkJwtConfig();
  const supabase = await checkSupabaseConnectivity();
  const authExchange = checkAuthExchangePrerequisites();
  const twilio = await checkTwilioCredentials();

  const components = [jwt, supabase, authExchange, twilio];
  const failed = components.find((component) => component.status === "error");
  const overall = failed ? "degraded" : "ok";

  return {
    jwt,
    supabase,
    authExchange,
    twilio,
    overall,
    error: failed?.error,
  };
}
