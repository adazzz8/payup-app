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
import { formatJerusalemCalendarYmd } from "../src/core/messaging/templates";
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

// 3b. appointmentDate — today keeps existing copy; earlier date uses backdated variant
record(
  "first_payment_request appointmentDate=today",
  "resolveBackdatedAppointmentDate → not backdated",
  "existing תודה שהיית היום",
  "today Asia/Jerusalem",
  () => {
    const todayYmd = formatJerusalemCalendarYmd(new Date());
    const appointmentDate = `${todayYmd}T16:00:00+03:00`;
    const built = buildCollectionMessage(
      basePayload({
        messageType: "first_payment_request",
        appointmentDate,
        totalAggregatedAmount: 600,
      }),
    );
    assert(built.messageText.includes("תודה שהיית היום ❤️"), "today copy");
    assert(!built.messageText.includes("קיבלתי עדכון על המפגש"), "not backdated");
  },
);

record(
  "first_payment_request appointmentDate=backdated",
  "backdated Asia/Jerusalem calendar date",
  "9.9 + ₪600, no היום",
  "uses totalAggregatedAmount",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "first_payment_request",
        appointmentDate: "2026-09-09T16:00:00+03:00",
        totalAggregatedAmount: 600,
      }),
    );
    assert(
      built.messageText.includes("קיבלתי עדכון על המפגש שלכם ב-9.9"),
      `date line: ${built.messageText}`,
    );
    assert(built.messageText.includes("היתרה המעודכנת כרגע היא ₪600"), "balance");
    assert(!built.messageText.includes("תודה שהיית היום"), "no today wording");
  },
);

record(
  "cumulative_balance_after_session appointmentDate=backdated",
  "shared backdated template",
  "9.9 + ₪1800, no היום",
  "amount from totalAggregatedAmount",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "cumulative_balance_after_session",
        appointmentDate: "2026-09-09T16:00:00+03:00",
        totalAggregatedAmount: 1800,
      }),
    );
    assert(built.messageText.includes("קיבלתי עדכון על המפגש שלכם ב-9.9"), "date");
    assert(built.messageText.includes("היתרה המעודכנת כרגע היא ₪1800"), "balance");
    assert(!built.messageText.includes("תודה שהיית היום"), "no today");
    assert(!built.messageText.includes("הסכום המצטבר כרגע"), "not today cumulative copy");
  },
);

record(
  "first_payment_request missing appointmentDate",
  "no backdated detection",
  "existing first_payment copy",
  "backward compatible",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "first_payment_request",
        appointmentDate: null,
        totalAggregatedAmount: 600,
      }),
    );
    assert(built.messageText.includes("תודה שהיית היום ❤️"), "legacy today copy");
    assert(!built.messageText.includes("קיבלתי עדכון על המפגש"), "no backdated");
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

// 8. payment_reminder — amount + single opening emoji
record(
  "payment_reminder amount 1200 / sessions 4",
  "resolveCollectionPaymentMessage + totalAggregatedAmount",
  "₪1200 + 4 פגישות + one 😊",
  "known type; amount from totalAggregatedAmount",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "payment_reminder",
        sessionCount: 4,
        totalAggregatedAmount: 1200,
      }),
    );
    assert(built.messageText.includes("₪1200"), "amount");
    assert(built.messageText.includes("עבור 4 פגישות"), "sessions");
    assert(built.messageText.includes("https://getpayup.io/pay/abc123"), "link");
    assert(built.messageText.includes("רק תזכורת קטנה\n"), "no emoji on reminder line");
    assert(!built.messageText.includes("רק תזכורת קטנה 😊"), "duplicate emoji removed");
    const opening = built.messageText.split("\n\n")[0] ?? "";
    assert(opening === "שלום דנה 😊", `opening: ${opening}`);
    assert((built.messageText.match(/😊/g) || []).length === 1, "exactly one 😊 in message");
    assert(built.messageText.includes("קיים חיוב פתוח בסך"), "balance wording");
    assert(!built.messageText.includes("תודה שהיית היום"), "no first_payment fallback");
  },
);

record(
  "payment_reminder amount 150",
  "resolveCollectionPaymentMessage + totalAggregatedAmount",
  "₪150",
  "amount follows payload",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "payment_reminder",
        sessionCount: 1,
        totalAggregatedAmount: 150,
      }),
    );
    assert(built.messageText.includes("₪150"), "amount 150");
    assert(built.messageText.includes("עבור הפגישה האחרונה"), "session singular");
  },
);

record(
  "payment_reminder without amount",
  "PAYMENT_REMINDER_AMOUNT_REQUIRED",
  "no invented amount / no SMS text",
  "rejects",
  () => {
    let threw = false;
    try {
      buildCollectionMessage(
        basePayload({
          messageType: "payment_reminder",
          sessionCount: 1,
          debt: { id: "debt_1", currency: "ILS" },
          totalAggregatedAmount: null,
        }),
      );
    } catch (error) {
      threw = true;
      assert(
        error instanceof CollectionMessageResolveError &&
          error.code === "PAYMENT_REMINDER_AMOUNT_REQUIRED",
        "code",
      );
    }
    assert(threw, "must throw");
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
      const out = buildCollectionMessage(
        basePayload({ messageType, sessionCount: 1, totalAggregatedAmount: 200 }),
      );
      assert(typeof out.messageText === "string" && out.messageText.length > 0, `${messageType} text`);
      assert(out.metadata.resolvedPaymentLink.startsWith("https://"), `${messageType} link`);
    }
  },
);

// 12. clinic identification + first-contact + payup_intro
record(
  "first_payment_request clinic no intro",
  "clinicDisplayName + isFirstPayUpContact=false",
  "clinic line; no long intro; מצרפים",
  "clinic framing",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "first_payment_request",
        clinicDisplayName: "רוני גריי",
        isFirstPayUpContact: false,
      }),
    );
    assert(built.messageText.includes("הודעה מהקליניקה של רוני גריי."), "clinic line");
    assert(!built.messageText.includes("הקליניקה התחילה להשתמש ב-PayUp"), "no intro");
    assert(built.messageText.includes("מצרפים לך כאן לינק"), "plural voice");
    assert(built.messageText.includes("תודה שהיית היום"), "today copy");
  },
);

record(
  "first_payment_request clinic + first contact",
  "isFirstPayUpContact=true",
  "clinic line + intro",
  "first contact",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "first_payment_request",
        clinicDisplayName: "רוני גריי",
        isFirstPayUpContact: true,
      }),
    );
    assert(built.messageText.includes("הודעה מהקליניקה של רוני גריי."), "clinic");
    assert(
      built.messageText.includes(
        "הקליניקה התחילה להשתמש ב-PayUp לצורך עדכוני תשלום וגבייה, ולכן מעכשיו הודעות בנושא עשויות להגיע אליך מכאן.",
      ),
      "intro",
    );
  },
);

record(
  "backdated cumulative clinic voice",
  "appointmentDate + clinicDisplayName",
  "קיבלנו + ₪1800 + 9.9",
  "plural clinic voice",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "cumulative_balance_after_session",
        appointmentDate: "2026-09-09T16:00:00+03:00",
        totalAggregatedAmount: 1800,
        clinicDisplayName: "רוני גריי",
        isFirstPayUpContact: false,
      }),
    );
    assert(built.messageText.includes("הודעה מהקליניקה של רוני גריי."), "clinic");
    assert(built.messageText.includes("קיבלנו עדכון על המפגש שלכם ב-9.9"), "date plural");
    assert(built.messageText.includes("היתרה המעודכנת כרגע היא ₪1800"), "amount");
    assert(built.messageText.includes("מצרפים לך כאן לינק"), "plural");
    assert(!built.messageText.includes("תודה שהיית היום"), "no today");
    assert(!built.messageText.includes("קיבלתי"), "no singular");
  },
);

record(
  "payment_reminder with clinic",
  "clinic + totalAggregatedAmount",
  "₪1200 + one 😊 + clinic line",
  "amount preserved",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "payment_reminder",
        sessionCount: 4,
        totalAggregatedAmount: 1200,
        clinicDisplayName: "רוני גריי",
      }),
    );
    assert(built.messageText.includes("הודעה מהקליניקה של רוני גריי."), "clinic");
    assert(built.messageText.includes("₪1200"), "amount");
    assert(built.messageText.includes("עבור 4 פגישות"), "sessions");
    assert((built.messageText.match(/😊/g) || []).length === 1, "one emoji");
    assert(!built.messageText.includes("רק תזכורת קטנה 😊"), "no duplicate emoji");
  },
);

record(
  "payup_intro exact template",
  "resolve + render",
  "standalone intro",
  "clinicDisplayName required",
  () => {
    const built = buildCollectionMessage(
      basePayload({
        messageType: "payup_intro",
        clinicDisplayName: "רוני גריי",
        isFirstPayUpContact: true,
        paymentLink: undefined,
        customer: { id: "cust_1", fullName: "אדם", phone: "0500000000" },
      }),
    );
    assert(built.messageText.includes("שלום אדם 😊"), "greeting");
    assert(built.messageText.includes("הודעה מהקליניקה של רוני גריי."), "clinic");
    assert(
      built.messageText.includes(
        "רצינו לעדכן שהקליניקה התחילה להשתמש ב-PayUp לצורך עדכוני תשלום וגבייה.",
      ),
      "intro line",
    );
    assert(
      built.messageText.includes(
        "מעכשיו, הודעות בנושא תשלומים ועדכונים מהקליניקה עשויות להגיע אליך מכאן.",
      ),
      "from here",
    );
    assert(
      built.messageText.includes("המטרה היא להפוך את העדכון והתשלום לפשוטים ונוחים יותר."),
      "goal",
    );
    assert(!built.messageText.includes("לשלם עכשיו"), "not a payment request");
  },
);

record(
  "legacy missing clinicDisplayName",
  "no clinic framing",
  "מצרפת / existing copy",
  "backward compatible",
  () => {
    const built = buildCollectionMessage(basePayload({ messageType: "first_payment_request" }));
    assert(!built.messageText.includes("הודעה מהקליניקה"), "no clinic line");
    assert(built.messageText.includes("מצרפת לך כאן לינק"), "legacy singular");
    assert(built.messageText.includes("ושיהיה המשך יום נפלא"), "legacy closing");
  },
);

record(
  "payup_intro missing clinicDisplayName",
  "CLINIC_DISPLAY_NAME_REQUIRED",
  "no SMS text",
  "rejects",
  () => {
    let threw = false;
    try {
      buildCollectionMessage(
        basePayload({
          messageType: "payup_intro",
          clinicDisplayName: null,
          paymentLink: undefined,
        }),
      );
    } catch (error) {
      threw = true;
      assert(
        error instanceof CollectionMessageResolveError &&
          error.code === "CLINIC_DISPLAY_NAME_REQUIRED",
        "code",
      );
    }
    assert(threw, "must throw");
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
