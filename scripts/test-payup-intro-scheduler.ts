/**
 * Automatic payup_intro scheduling. No Twilio / no real SMS.
 * Run: npx tsx scripts/test-payup-intro-scheduler.ts
 */

import { deliverPayupIntro, previewPayupIntro } from "../src/core/messaging/payupIntroDelivery";
import { createMemoryPayupIntroDeliveryStore } from "../src/core/messaging/payupIntroDeliveryStore";
import { isPreviewOnlyCustomerId, readPayupIntroRequest } from "../src/core/messaging/payupIntroRequest";
import { processDuePayupIntros } from "../src/core/messaging/payupIntroScheduler";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

const friday = new Date("2026-10-16T11:00:00+03:00");
const sundayTen = new Date("2026-10-18T10:00:00+03:00");

function context(customerId: string) {
  return {
    businessId: "biz-1",
    customerId,
    customerName: "דוד כהן",
    clinicDisplayName: "הקליניקה של יותמסקי",
    phone: "0500000001",
  };
}

async function main(): Promise<void> {
  const store = createMemoryPayupIntroDeliveryStore();
  const sends: string[] = [];
  const send = async (message: { to: string; body: string }) => {
    sends.push(message.to);
    return { success: true, sid: "SM_TEST", error: null };
  };

  const fridayResult = await deliverPayupIntro({
    ...context("cust-david"),
    now: friday,
    store,
    send,
  });
  const stored = await store.get("biz-1", "cust-david");
  assert(fridayResult.status === "scheduled" && stored?.status === "scheduled" && sends.length === 0, "A: Friday request stored scheduled");
  assert(stored?.phone === "0500000001" && stored.scheduledFor !== null, "A: phone and scheduledFor persisted");

  const early = await processDuePayupIntros({ now: friday, store, send });
  assert(early.picked === 0 && sends.length === 0, "A: scheduler does not send before scheduledFor");

  const picked = await processDuePayupIntros({ now: sundayTen, store, send });
  const sent = await store.get("biz-1", "cust-david");
  assert(picked.picked === 1, "B: scheduler picks up the due job");
  assert(sends.length === 1, "C: Twilio send called once");
  assert(sent?.status === "sent" && sent.providerMessageId === "SM_TEST", "D: successful send status sent");

  const again = await processDuePayupIntros({ now: sundayTen, store, send });
  assert(again.picked === 0 && sends.length === 1, "F: duplicate protection, no second SMS");

  const retryStore = createMemoryPayupIntroDeliveryStore();
  let retrySends = 0;
  await deliverPayupIntro({
    ...context("cust-retry"),
    now: friday,
    store: retryStore,
    send: async () => ({ success: true, sid: null, error: null }),
  });
  const retrySend = async () => {
    retrySends += 1;
    return { success: false, sid: null, error: "TRANSPORT_FAILED" };
  };
  await processDuePayupIntros({ now: sundayTen, store: retryStore, send: retrySend });
  const failed = await retryStore.get("biz-1", "cust-retry");
  assert(retrySends === 3 && failed?.status === "failed" && failed.attempts === 3, "E: transient failure retries up to 3");
  await processDuePayupIntros({ now: sundayTen, store: retryStore, send: retrySend });
  assert(retrySends === 3, "E: no attempt after limit");

  const previewSends: string[] = [];
  const rejected = await deliverPayupIntro({
    ...context("preview"),
    now: sundayTen,
    store,
    send: async (message) => {
      previewSends.push(message.to);
      return { success: true, sid: "SM_BAD", error: null };
    },
  });
  assert(
    isPreviewOnlyCustomerId("preview") &&
      rejected.error === "PREVIEW_CUSTOMER_ID_NOT_ALLOWED" &&
      previewSends.length === 0 &&
      (await store.get("biz-1", "preview")) === null,
    "G: real send with customer id preview rejected",
  );

  await store.save({
    businessId: "biz-old",
    customerId: "preview",
    status: "scheduled",
    attempts: 0,
    lastError: null,
    scheduledFor: "2026-10-18T07:00:00.000Z",
    providerMessageId: null,
    messageText: "stored intro",
    phone: "0500000002",
  });
  const unsafe = await processDuePayupIntros({
    now: sundayTen,
    store,
    send: async (message) => {
      previewSends.push(message.to);
      return { success: true, sid: "SM_BAD", error: null };
    },
  });
  const unsafeRow = await store.get("biz-old", "preview");
  assert(unsafe.picked === 0 && previewSends.length === 0 && unsafeRow?.status === "scheduled", "G: stored preview id is not auto-sent");

  const preview = previewPayupIntro({
    customerName: "דוד כהן",
    clinicDisplayName: "הקליניקה של יותמסקי",
    now: friday,
  });
  const previewRead = readPayupIntroRequest({
    messageType: "payup_intro",
    payload: {
      messageType: "payup_intro",
      clinicDisplayName: "הקליניקה של יותמסקי",
      business: { id: "biz-1" },
      customer: { id: "preview", fullName: "דוד כהן", phone: "0500000001" },
    },
  });
  assert(
    preview.renderedMessage.includes("דוד כהן") &&
      preview.eligibleNow === false &&
      previewRead.kind === "ready" &&
      sends.length === 1,
    "H: preview works without sending",
  );

  console.log("\n--- summary ---");
  console.log(JSON.stringify({ failures, result: failures === 0 ? "PASS" : "FAIL" }, null, 2));
  process.exit(failures === 0 ? 0 : 1);
}

main();
