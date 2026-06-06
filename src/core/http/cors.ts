import { NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = ["https://getpayup.io"];

export function getAllowedCorsOrigins(): string[] {
  const raw = process.env.ALLOWED_CORS_ORIGINS?.trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function resolveCorsOrigin(request: Request): string {
  const allowed = getAllowedCorsOrigins();
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowed[0] ?? DEFAULT_ALLOWED_ORIGINS[0];
}

export function getCorsHeaders(request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(request),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
    Vary: "Origin",
  };
}

export function jsonWithCors(request: Request, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: getCorsHeaders(request) });
}

export function emptyCorsResponse(request: Request, status: number, extraHeaders?: Record<string, string>) {
  return new NextResponse(null, {
    status,
    headers: {
      ...getCorsHeaders(request),
      ...extraHeaders,
    },
  });
}
