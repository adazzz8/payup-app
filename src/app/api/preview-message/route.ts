import { requireAuth } from "@/core/auth/requireAuth";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";
import { previewMessage } from "@/core/messaging/previewMessage";

export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204, { "Access-Control-Max-Age": "86400" });
}

/** Renders a message. Does not send SMS, schedule delivery, or write records. */
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(request, { success: false, error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const preview = previewMessage(body);
  if (!preview.success) {
    return jsonWithCors(
      request,
      { success: false, error: preview.error, code: preview.code },
      preview.status,
    );
  }

  return jsonWithCors(
    request,
    { success: true, template: preview.template, message: preview.message },
    200,
  );
}
