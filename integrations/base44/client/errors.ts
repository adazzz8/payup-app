export type PayUpAuthErrorCode = "NOT_AUTHENTICATED" | "TOKEN_REFRESH_FAILED" | "RAILWAY_AUTH_FAILED";

export class PayUpAuthError extends Error {
  constructor(
    message: string,
    readonly code: PayUpAuthErrorCode,
  ) {
    super(message);
    this.name = "PayUpAuthError";
  }
}

export function isPayUpTokenUnauthorized(status: number, body: unknown): boolean {
  if (status !== 401) return false;
  if (!body || typeof body !== "object") return true;
  const code = (body as { code?: unknown }).code;
  return code === "TOKEN_MISSING" || code === "TOKEN_INVALID" || code === undefined;
}
