import { timingSafeEqual } from "crypto";

export function verifyServiceApiKey(authorizationHeader: string | null): boolean {
  const expected = process.env.BASE44_SERVICE_API_KEY?.trim();
  if (!expected) return false;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return false;
  }

  const provided = authorizationHeader.slice("Bearer ".length).trim();
  if (!provided) return false;

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length) return false;

  return timingSafeEqual(expectedBuf, providedBuf);
}
