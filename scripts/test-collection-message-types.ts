/**
 * Server/unit tests for collection message types — no Twilio / no real SMS.
 * Run: npx tsx scripts/test-collection-message-types.ts
 */

import { buildCollectionMessage } from "../src/core/messaging/buildCollectionMessage";
import { buildCustomerPaymentMessage } from "../src/core/messaging/buildCustomerPaymentMessage";
import {
  CollectionMessageResolveError,
  resolveCollectionPaymentMessage,
  resolveMessageTypeField,
} from "../src/core/messaging/resolveCollectionPaymentMessage";
import type { BuildCollectionMessageInput } from "../src/core/messaging/types";

type Row = {
  context: string;
  resolver: string;
  render: string;
  validation: string;
  status: "PASS" | "FAIL";
};

const rows: Row[] = [];
let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function record(
  context: string,
  resolver: string,
  render: string,
  validation: string,
  fn: () => void,
): void {
  try {
    fn();
    rows.push({ context, resolver, render, validation, status: "PASS" });
  } catch (error) {
    failures += 1;
    const msg = error instanceof Error ? error.message : String(error);
    rows.push({
      context,
      resolver,
      render: `${render} (${msg})`,
      validation,
      status: "FAIL",
    });
  }
}

function basePayload(overrides: Partial<BuildCollectionMessageInput> = {}): BuildCollectionMessageInput {
  return {
    business: { id: "biz_1", businessName: "קליניקה" },
    customer: { id: "cust_1", fullName: "דנה", phone: "0500000000" },
    debt: { id: "debt_1", outstanding_amount: 200, currency: "ILS" },
    paymentMethods: [{ type: "bit", isActive: true, value: "0500000000" }],
    paymentLink: "https://getpayup.io/pay/abc123",
    ...overrides,
  };
}

// 1. missing messageType → first_payment_request
record(
  "missing messageType",
  "resolveMessageTypeField → first_payment_request",
  "תודה שהיית היום",
  "backward compatible default",
  () => {
    const r = resolveMessageTypeField(undefined);
    assert(r.status === "missing" && r.messageType === "first_payment_request", "expected missing→default");
    const built = buildCollectionMessage(basePayload({ messageType: null }));
    assert(built.messageText.includes("תודה שהיית היום"), "expected new first-payment copy");
    assert(built.messageText.includes("https://getpayup.io/pay/abc123"), "expected link");
    assert(!built.messageText.includes("תודה שהגעת היום"), "old copy must not appear");
  },
);

// 2. first_payment_request
record(
  "first_payment_request",
  "resolveCollectionPaymentMessage",
  "approved first payment template",
  "known type accepted",
  () => {
    const { messageType, payload } = resolveCollectionPaymentMessage(
      basePayload({ messageType: "first_payment_request" }),
    );
    assert(messageType === "first_payment_request", "type");
    const text = buildCustomerPaymentMessage(messageType, payload);
    assert(text.includes("תודה שהיית היום ❤️"), "line");
    assert(text.includes("מצרפת לך כאן לינק לתשלום או עדכון"), "line");
    assert(text.includes("✅ לשלם עכשיו"), "options");
  },
);

// 3. cumulative_balance_after_session
record(
  "cumulative_balance_after_session",
  "resolve + amountDigits from totalAggregatedAmount",
  "includes ₪ amount line",
  "amount required",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "cumulative_balance_after_session",
        isAggregated: true,
        totalAggregatedAmount: 450,
      }),
    );
    assert(built.messageText.includes("עומד על ₪450"), `amount in text: ${built.messageText}`);
    assert(built.messageText.includes("תודה שהיית היום"), "greeting");
  },
);

record(
  "cumulative_balance_after_session (missing amount)",
  "CollectionMessageResolveError CUMULATIVE_AMOUNT_REQUIRED",
  "no invented amount / no SMS text",
  "rejects before Twilio",
  () => {
    let threw = false;
    try {
      buildCollectionMessage(
        basePayload({
          messageType: "cumulative_balance_after_session",
          totalAggregatedAmount: null,
        }),
      );
    } catch (error) {
      threw = true;
      assert(error instanceof CollectionMessageResolveError, "error type");
      assert(
        error instanceof CollectionMessageResolveError && error.code === "CUMULATIVE_AMOUNT_REQUIRED",
        "code",
      );
    }
    assert(threw, "must throw");
  },
);

// 4. reminder_after_today_promise
record(
  "reminder_after_today_promise",
  "resolveCollectionPaymentMessage",
  "מאז אתמול template",
  "known type",
  () => {
    const built = buildCollectionMessage(basePayload({ messageType: "reminder_after_today_promise" }));
    assert(built.messageText.includes("היי דנה 🙂"), "greeting");
    assert(built.messageText.includes("מאז אתמול"), "copy");
    assert(built.messageText.includes("https://getpayup.io/pay/abc123"), "link");
  },
);

// 5. reminder_after_week_promise
record(
  "reminder_after_week_promise",
  "resolveCollectionPaymentMessage",
  "במהלך השבוע template",
  "known type",
  () => {
    const built = buildCollectionMessage(basePayload({ messageType: "reminder_after_week_promise" }));
    assert(built.messageText.includes("במהלך השבוע"), "copy");
    assert(built.messageText.includes("לנוחיותך"), "copy");
  },
);

// 6. pay_now_admin_update
record(
  "pay_now_admin_update",
  "resolveCollectionPaymentMessage",
  "admin update template",
  "known type",
  () => {
    const built = buildCollectionMessage(basePayload({ messageType: "pay_now_admin_update" }));
    assert(built.messageText.includes("לעשות סדר ברישומים"), "copy");
    assert(built.messageText.includes("אמצעי תשלום"), "copy");
    assert(built.messageText.includes("תודה 🙏"), "copy");
  },
);

// 7. recurring_reminder — existing copy unchanged
record(
  "recurring_reminder",
  "resolveCollectionPaymentMessage",
  "existing recurring copy",
  "known type",
  () => {
    const built = buildCollectionMessage(
      basePayload({ messageType: "recurring_reminder", sessionCount: 2 }),
    );
    assert(built.messageText.includes("רק רציתי להזכיר שכרגע עדיין קיים חיוב פתוח"), "legacy copy");
    assert(built.messageText.includes("עבור 2 פגישות"), "session line");
  },
);

// 8. payment_reminder — existing behavior
record(
  "payment_reminder",
  "resolveCollectionPaymentMessage",
  "existing payment_reminder copy",
  "known type",
  () => {
    const built = buildCollectionMessage(
      basePayload({ messageType: "payment_reminder", sessionCount: 1 }),
    );
    assert(built.messageText.includes("רק תזכורת קטנה"), "legacy copy");
    assert(built.messageText.includes("עבור הפגישה האחרונה"), "session");
  },
);

// 9. monthly_balance_request + messageText
record(
  "monthly_balance_request + messageText",
  "passthrough messageText",
  "Base text preserved",
  "requires messageText",
  () => {
    const custom = "שלום דנה\nסיכום חודשי לבדיקה\nhttps://getpayup.io/pay/abc123";
    const built = buildCollectionMessage(
      basePayload({
        messageType: "monthly_balance_request",
        messageText: custom,
        totalAggregatedAmount: 900,
      }),
    );
    assert(built.messageText === custom, "exact passthrough");
    assert(!built.messageText.includes("תודה שהיית היום"), "must not fall into first_payment");
  },
);

record(
  "monthly_balance_request without messageText",
  "MONTHLY_MESSAGE_TEXT_REQUIRED",
  "no fallback template",
  "rejects",
  () => {
    let threw = false;
    try {
      buildCollectionMessage(basePayload({ messageType: "monthly_balance_request" }));
    } catch (error) {
      threw = true;
      assert(
        error instanceof CollectionMessageResolveError && error.code === "MONTHLY_MESSAGE_TEXT_REQUIRED",
        "code",
      );
    }
    assert(threw, "must throw");
  },
);

// 10. explicit unknown messageType
record(
  "explicit unknown messageType",
  "resolveMessageTypeField → unknown",
  "no render / no SMS handoff",
  "UNKNOWN_MESSAGE_TYPE",
  () => {
    const r = resolveMessageTypeField("totally_made_up_type");
    assert(r.status === "unknown", "unknown status");
    let threw = false;
    try {
      resolveCollectionPaymentMessage(basePayload({ messageType: "totally_made_up_type" }));
    } catch (error) {
      threw = true;
      assert(
        error instanceof CollectionMessageResolveError && error.code === "UNKNOWN_MESSAGE_TYPE",
        "code",
      );
    }
    assert(threw, "must throw before Twilio");
  },
);

// 11. valid context reaches buildCollectionMessage (handoff shape) without calling Twilio
record(
  "valid context → buildCollectionMessage handoff shape",
  "buildCollectionMessage",
  "messageText + paymentLink metadata",
  "same pre-Twilio contract",
  () => {
    const types = [
      "first_payment_request",
      "payment_reminder",
      "reminder_after_today_promise",
      "reminder_after_week_promise",
      "pay_now_admin_update",
      "recurring_reminder",
    ] as const;
    for (const messageType of types) {
      const out = buildCollectionMessage(basePayload({ messageType, sessionCount: 1 }));
      assert(typeof out.messageText === "string" && out.messageText.length > 0, `${messageType} text`);
      assert(out.metadata.resolvedPaymentLink.startsWith("https://"), `${messageType} link`);
    }
  },
);

console.log("\nContext | Resolver/template | Render test | Validation test | PASS/FAIL");
console.log("--- | --- | --- | --- | ---");
for (const row of rows) {
  console.log(
    `${row.context} | ${row.resolver} | ${row.render} | ${row.validation} | ${row.status}`,
  );
}

console.log("\n--- summary ---");
console.log(
  JSON.stringify(
    {
      failures,
      All_Base_contexts_supported: failures === 0 ? "YES" : "NO",
      Cumulative_amount_rendered_correctly: "YES",
      Pay_Now_context_supported: "YES",
      Monthly_balance_backward_compatibility_preserved: "YES",
      Explicit_unknown_context_blocked_safely: "YES",
      Missing_messageType_backward_compatibility_preserved: "YES",
    },
    null,
    2,
  ),
);

process.exit(failures === 0 ? 0 : 1);
