import { NextResponse } from "next/server";
import type { AuthErrorCode } from "@/core/auth/types";

export function jsonError(
  body: { error: string; code: AuthErrorCode | string },
  status: number,
): NextResponse {
  return NextResponse.json(body, { status });
}
