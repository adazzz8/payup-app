import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/core/auth/jwt";
import type { AuthContext } from "@/core/auth/types";
import { jsonWithCors } from "@/core/http/cors";

export type RequireAuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; response: NextResponse };

function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authorizationHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function requireAuth(request: Request): RequireAuthResult {
  const token = parseBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return {
      ok: false,
      response: jsonWithCors(request, { error: "Authorization required", code: "TOKEN_MISSING" }, 401),
    };
  }

  try {
    const claims = verifyAccessToken(token);
    if (!claims) {
      return {
        ok: false,
        response: jsonWithCors(request, { error: "Invalid or expired token", code: "TOKEN_INVALID" }, 401),
      };
    }

    return { ok: true, context: { userId: claims.sub } };
  } catch {
    return {
      ok: false,
      response: jsonWithCors(request, { error: "Invalid or expired token", code: "TOKEN_INVALID" }, 401),
    };
  }
}
