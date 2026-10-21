/**
 * Render-only preview-message tests. No Twilio, no database.
 * Run: npx tsx scripts/test-preview-message.ts
 */

import { readFileSync } from "node:fs";
import { mintAccessToken } from "../src/core/auth/jwt";
import { buildCustomerPaymentMessage } from "../src/core/messaging/buildCustomerPaymentMessage";
import { deliverPayupIntro } from "../src/core/messaging/payupIntroDelivery";
import { createMemoryPayupIntroDeliveryStore } from "../src/core/messaging/payupIntroDeliveryStore";
import { renderPayupIntroMessage } from "../src/core/messaging/payupIntroTemplate";
import { previewMessage } from "../src/core/messaging/previewMessage";
import { POST } from "../src/app/api/preview-message/route";

process.env.PAYUP_JWT_SECRET ??= "preview-message-test-secret";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

const customerName = "אדם";
const clinicDisplayName = "רוני גריי";
const expected = renderPayupIntroMessage({ customerName, clinicDisplayName });

function authedRequest(body: unknown): Request {
  const { token } = mintAccessToken("therapist-preview-test");
  return new Request("https://payup.test/api/preview-message", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function main(): Promise<void> {
  {
    const preview = previewMessage({ template: "payup_intro", customerName, clinicDisplayName });
    const response = await POST(authedRequest({ template: "payup_intro", customerName, clinicDisplayName }));
    const body = (await response.json()) as { success?: boolean; template?: string; message?: string };
    assert(response.status === 200 && preview.success && body.success === true, "A: 200");
    assert(body.template === "payup_intro" && body.message === expected, "A: exact production message");
    assert(preview.success && preview.message === expected, "A: renderer output");
  }

  {
    const preview = previewMessage({ template: "payup_intro", clinicDisplayName });
    const response = await POST(authedRequest({ template: "payup_intro", clinicDisplayName }));
    const body = (await response.json()) as { success?: boolean; error?: string; code?: string };
    assert(response.status === 422 && !preview.success, "B: missing customerName is 4xx");
    assert(body.code === "CUSTOMER_NAME_REQUIRED" && body.error === "customerName is required.", "B: user-safe message");
  }

  {
    const preview = previewMessage({ template: "payup_intro", customerName });
    const response = await POST(authedRequest({ template: "payup_intro", customerName }));
    const body = (await response.json()) as { code?: string; error?: string };
    assert(response.status === 422 && !preview.success, "C: missing clinicDisplayName is 4xx");
    assert(
      body.code === "CLINIC_DISPLAY_NAME_REQUIRED" && body.error === "clinicDisplayName is required.",
      "C: user-safe message",
    );
  }

  {
    const preview = previewMessage({ template: "payment_reminder", customerName, clinicDisplayName });
    const response = await POST(
      authedRequest({ template: "payment_reminder", customerName, clinicDisplayName }),
    );
    const body = (await response.json()) as { code?: string; message?: string };
    assert(response.status === 422 && !preview.success, "D: unsupported template is 4xx");
    assert(body.code === "UNSUPPORTED_TEMPLATE" && body.message === undefined, "D: no rendered message");
  }

  {
    let providerCalls = 0;
    const store = createMemoryPayupIntroDeliveryStore();
    const sent = await deliverPayupIntro({
      businessId: "biz",
      customerId: "cust-preview-parity",
      customerName,
      clinicDisplayName,
      phone: "0500000000",
      now: new Date("2026-10-18T11:00:00+03:00"),
      store,
      send: async () => {
        providerCalls += 1;
        return { success: true, sid: "SM_TEST", error: null };
      },
    });
    const preview = previewMessage({ template: "payup_intro", customerName, clinicDisplayName });
    const viaPublicRenderer = buildCustomerPaymentMessage("payup_intro", { customerName, clinicDisplayName });
    assert(
      preview.success &&
        preview.message === sent.renderedMessage &&
        preview.message === viaPublicRenderer &&
        preview.message === expected,
      "E: preview text matches send text",
    );
    assert(providerCalls === 1, "E: parity send used its own test double once");
    providerCalls = 0;
    previewMessage({ template: "payup_intro", customerName, clinicDisplayName });
    assert(providerCalls === 0, "F: preview makes 0 provider calls");
  }

  const routeSource = readFileSync(new URL("../src/app/api/preview-message/route.ts", import.meta.url), "utf8");
  const previewSource = readFileSync(new URL("../src/core/messaging/previewMessage.ts", import.meta.url), "utf8");
  const combined = `${routeSource}\n${previewSource}`;
  assert(!combined.includes("היי {{customerName}}"), "template text is not duplicated");
  assert(combined.includes("renderPayupIntroMessage"), "uses canonical renderer");
  assert(
    !/twilio|supabase|deliverPayupIntro|payupIntroDeliveryStore|resolvePayupIntroTiming/.test(combined),
    "no send, store, or schedule",
  );

  if (failures > 0) {
    console.error(`${failures} failed`);
    process.exit(1);
  }
  console.log("preview message: all passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
