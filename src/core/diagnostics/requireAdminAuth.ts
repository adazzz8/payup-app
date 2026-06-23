import { verifyServiceApiKey } from "@/core/auth/verifyServiceKey";
import { jsonError } from "@/core/http/jsonError";

export function requireAdminAuth(request: Request): Response | null {
  if (!verifyServiceApiKey(request.headers.get("Authorization"))) {
    return jsonError({ error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" }, 401);
  }
  return null;
}
