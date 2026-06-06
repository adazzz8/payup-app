/**
 * Base44 server-only configuration.
 * Set these in Base44 dashboard / server secrets — never in the PWA bundle.
 */
export function getPayUpRailwayBaseUrl(): string {
  const url = process.env.PAYUP_RAILWAY_BASE_URL?.trim();
  if (!url) {
    throw new Error("PAYUP_RAILWAY_BASE_URL is not configured on the Base44 server.");
  }
  return url.replace(/\/$/, "");
}

export function getBase44ServiceApiKey(): string {
  const key = process.env.BASE44_SERVICE_API_KEY?.trim();
  if (!key) {
    throw new Error("BASE44_SERVICE_API_KEY is not configured on the Base44 server.");
  }
  return key;
}
