import { requireAuth } from "@/core/auth/requireAuth";
import { emptyCorsResponse, jsonWithCors } from "@/core/http/cors";
import { previewPayupIntro } from "@/core/messaging/payupIntroDelivery";
import { readPayupIntroRequest } from "@/core/messaging/payupIntroRequest";

export async function OPTIONS(request: Request) {
  return emptyCorsResponse(request, 204, { "Access-Control-Max-Age": "86400" });
}

/** Preview uses the same renderer and delivery clock as payup_intro send. Does not send SMS. */
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: {
    payload?: unknown;
    messageType?: unknown;
    message_type?: unknown;
    clinicDisplayName?: unknown;
    clinic_display_name?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonWithCors(request, { error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const intro = readPayupIntroRequest({ ...body, messageType: body.messageType ?? "payup_intro" });
  if (intro.kind === "not_intro") {
    return jsonWithCors(
      request,
      {
        error: "Preview currently supports payup_intro only.",
        code: "UNSUPPORTED_PREVIEW_TYPE",
      },
      422,
    );
  }
  if (intro.kind === "invalid") {
    return jsonWithCors(
      request,
      {
        error: "Validation failed",
        code: intro.code,
        details: [{ field: intro.field, message: intro.message }],
      },
      422,
    );
  }

  const preview = previewPayupIntro({
    customerName: intro.context.customerName,
    clinicDisplayName: intro.context.clinicDisplayName,
  });

  return jsonWithCors(request, preview, 200);
}
