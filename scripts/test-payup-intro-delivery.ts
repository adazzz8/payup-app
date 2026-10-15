/**
 * payup_intro delivery policy, template parity, duplicate guard, and retry.
 * No Twilio / no real SMS.
 * Run: npx tsx scripts/test-payup-intro-delivery.ts
 */

import { deliverPayupIntro, previewPayupIntro } from "../src/core/messaging/payupIntroDelivery";
import { jerusalemClock } from "../src/core/messaging/payupIntroDeliveryPolicy";
import { createMemoryPayupIntroDeliveryStore } from "../src/core/messaging/payupIntroDeliveryStore";
import { PAYUP_INTRO_TEMPLATE } from "../src/core/messaging/payupIntroTemplate";

const expectedTemplate =
  "היי אדם, רוני גריי התחילה להשתמש ב-PayUp לניהול ועדכוני תשלומים. מעכשיו ייתכן שתקבל/י מ-PayUp הודעות הקשורות לתשלומים שלך בקליניקה. אין צורך לעשות דבר כרגע.";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

function at(iso: string): Date {
  return new Date(iso);
}

function scheduledClock(iso: string | null): { ymd: string; hour: number; minute: number } | null {
  if (!iso) return null;
  const clock = jerusalemClock(new Date(iso));
  return { ymd: clock.ymd, hour: clock.hour, minute: clock.minute };
}

async function main(): Promise<void> {
const cases: Array<{ id: string; now: string; eligible: boolean; ymd?: string; hour?: number }> = [
  { id: "A", now: "2026-10-18T11:00:00+03:00", eligible: true },
  { id: "B", now: "2026-10-18T19:59:00+03:00", eligible: true },
  { id: "C", now: "2026-10-18T20:01:00+03:00", eligible: false, ymd: "2026-10-19", hour: 10 },
  { id: "D", now: "2026-10-18T23:30:00+03:00", eligible: false, ymd: "2026-10-19", hour: 10 },
  { id: "E", now: "2026-10-19T07:00:00+03:00", eligible: false, ymd: "2026-10-19", hour: 10 },
  { id: "F", now: "2026-10-16T11:00:00+03:00", eligible: false, ymd: "2026-10-18", hour: 10 },
  { id: "G", now: "2026-10-17T12:00:00+03:00", eligible: false, ymd: "2026-10-18", hour: 10 },
  { id: "H", now: "2026-09-20T11:00:00+03:00", eligible: false, ymd: "2026-09-21", hour: 10 },
];

for (const item of cases) {
  const preview = previewPayupIntro({
    customerName: "אדם",
    clinicDisplayName: "רוני גריי",
    now: at(item.now),
  });
  if (item.eligible) {
    assert(preview.eligibleNow === true && preview.scheduledFor === null, `${item.id}: eligible now`);
  } else {
    const clock = scheduledClock(preview.scheduledFor);
    assert(
      preview.eligibleNow === false && clock?.ymd === item.ymd && clock?.hour === item.hour && clock?.minute === 0,
      `${item.id}: scheduled ${item.ymd} 10:00, got ${JSON.stringify(clock)}`,
    );
  }
}

assert(PAYUP_INTRO_TEMPLATE.includes("{{customerName}}") && PAYUP_INTRO_TEMPLATE.includes("{{clinicDisplayName}}"), "template placeholders");

{
  const preview = previewPayupIntro({
    customerName: "אדם",
    clinicDisplayName: "רוני גריי",
    now: at("2026-10-18T11:00:00+03:00"),
  });
  const store = createMemoryPayupIntroDeliveryStore();
  let sentBody = "";
  const delivered = await deliverPayupIntro({
    businessId: "biz",
    customerId: "cust",
    customerName: "אדם",
    clinicDisplayName: "רוני גריי",
    phone: "0500000000",
    now: at("2026-10-18T11:00:00+03:00"),
    store,
    send: async ({ body }) => {
      sentBody = body;
      return { success: true, sid: "SM_TEST", error: null };
    },
  });
  assert(preview.renderedMessage === expectedTemplate, "I: preview template");
  assert(sentBody === preview.renderedMessage && delivered.renderedMessage === preview.renderedMessage, "I: preview matches send");
  assert(preview.characterCount === expectedTemplate.length, "I: character count");
}

{
  const store = createMemoryPayupIntroDeliveryStore();
  let sends = 0;
  const input = {
    businessId: "biz",
    customerId: "cust",
    customerName: "אדם",
    clinicDisplayName: "רוני גריי",
    phone: "0500000000",
    now: at("2026-10-18T11:00:00+03:00"),
    store,
    send: async () => {
      sends += 1;
      return { success: true, sid: "SM_ONCE", error: null };
    },
  };
  const first = await deliverPayupIntro(input);
  const second = await deliverPayupIntro(input);
  assert(first.status === "sent" && second.status === "sent" && second.duplicateSuppressed && sends === 1, "J: no second SMS");
}

{
  const store = createMemoryPayupIntroDeliveryStore();
  let sends = 0;
  const input = {
    businessId: "biz",
    customerId: "cust",
    customerName: "אדם",
    clinicDisplayName: "רוני גריי",
    phone: "0500000000",
    now: at("2026-10-18T11:00:00+03:00"),
    store,
    send: async () => {
      sends += 1;
      return { success: false, sid: null, error: "TRANSPORT_TIMEOUT" };
    },
  };
  const failed = await deliverPayupIntro(input);
  const again = await deliverPayupIntro(input);
  assert(failed.status === "failed" && failed.attempts === 3 && sends === 3, "K: retry max 3");
  assert(again.status === "failed" && again.duplicateSuppressed && sends === 3, "K: no attempt after limit");
}

console.log("\n--- summary ---");
console.log(JSON.stringify({ failures, result: failures === 0 ? "PASS" : "FAIL" }, null, 2));
process.exit(failures === 0 ? 0 : 1);
}

main();
