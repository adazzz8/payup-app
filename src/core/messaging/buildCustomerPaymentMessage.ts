/**
 * Sole public API for customer payment SMS copy.
 * Template bodies and render helpers are private to this module.
 */

const customerPaymentMessageIds = {
  first_payment_request: "first_payment_request",
  payment_reminder: "payment_reminder",
  reminder_after_today_promise: "reminder_after_today_promise",
  reminder_after_week_promise: "reminder_after_week_promise",
  recurring_reminder: "recurring_reminder",
} as const;

export type CustomerPaymentMessageId =
  (typeof customerPaymentMessageIds)[keyof typeof customerPaymentMessageIds];

const customerPaymentMessageIdValues = Object.values(customerPaymentMessageIds);

export function isCustomerPaymentMessageId(value: string): value is CustomerPaymentMessageId {
  return (customerPaymentMessageIdValues as string[]).includes(value);
}

export type CustomerPaymentMessageInputMap = {
  first_payment_request: {
    customerName: string;
    paymentLink: string;
  };
  payment_reminder: {
    customerName: string;
    paymentLink: string;
    sessionCount: number;
  };
  reminder_after_today_promise: {
    customerName: string;
    paymentLink: string;
  };
  reminder_after_week_promise: {
    customerName: string;
    paymentLink: string;
  };
  recurring_reminder: {
    customerName: string;
    paymentLink: string;
    sessionCount: number;
  };
};

const paymentLinkOptionsBlock = [
  "✅ לשלם עכשיו",
  "",
  "✅ לעדכן שהתשלום כבר בוצע",
  "",
  "✅ לעדכן שהתשלום יבוצע בהמשך",
].join("\n");

function formatSessionLine(sessionCount: number): string {
  return sessionCount === 1 ? "עבור הפגישה האחרונה." : `עבור ${sessionCount} פגישות.`;
}

function renderFirstPaymentRequest(input: CustomerPaymentMessageInputMap["first_payment_request"]): string {
  return [
    `שלום ${input.customerName} 😊`,
    "",
    "תודה שהגעת היום ❤️",
    "",
    "מצרף כאן את הקישור להסדרת התשלום, כשיהיה לך נוח.",
    "",
    "בקישור אפשר:",
    "",
    paymentLinkOptionsBlock,
    "",
    input.paymentLink,
    "",
    "תודה רבה,",
    "ושיהיה המשך יום נפלא 🙏",
  ].join("\n");
}

function renderPaymentReminder(input: CustomerPaymentMessageInputMap["payment_reminder"]): string {
  return [
    `שלום ${input.customerName} 😊`,
    "",
    "רק תזכורת קטנה 😊",
    "",
    "כרגע עדיין קיים חיוב פתוח.",
    "",
    formatSessionLine(input.sessionCount),
    "",
    "בקישור למטה אפשר לבחור איך להמשיך:",
    "",
    paymentLinkOptionsBlock,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ].join("\n");
}

function renderReminderAfterTodayPromise(
  input: CustomerPaymentMessageInputMap["reminder_after_today_promise"],
): string {
  return [
    `שלום ${input.customerName} 😊`,
    "",
    "מוקדם יותר עדכנת שהתשלום יבוצע היום, ולכן רק רציתי לשלוח תזכורת קטנה.",
    "",
    "בקישור אפשר:",
    "",
    paymentLinkOptionsBlock,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ].join("\n");
}

function renderReminderAfterWeekPromise(
  input: CustomerPaymentMessageInputMap["reminder_after_week_promise"],
): string {
  return [
    `שלום ${input.customerName} 😊`,
    "",
    "לפני מספר ימים עדכנת שהתשלום יבוצע במהלך השבוע.",
    "",
    "אם עדיין לא הספקת, אפשר להשתמש בקישור כדי:",
    "",
    paymentLinkOptionsBlock,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ].join("\n");
}

function renderRecurringReminder(input: CustomerPaymentMessageInputMap["recurring_reminder"]): string {
  return [
    `שלום ${input.customerName} 😊`,
    "",
    "רק רציתי להזכיר שכרגע עדיין קיים חיוב פתוח.",
    "",
    formatSessionLine(input.sessionCount),
    "",
    "בקישור אפשר:",
    "",
    paymentLinkOptionsBlock,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ].join("\n");
}

export function buildCustomerPaymentMessage<T extends CustomerPaymentMessageId>(
  type: T,
  data: CustomerPaymentMessageInputMap[T],
): string {
  switch (type) {
    case customerPaymentMessageIds.first_payment_request:
      return renderFirstPaymentRequest(data as CustomerPaymentMessageInputMap["first_payment_request"]);
    case customerPaymentMessageIds.payment_reminder:
      return renderPaymentReminder(data as CustomerPaymentMessageInputMap["payment_reminder"]);
    case customerPaymentMessageIds.reminder_after_today_promise:
      return renderReminderAfterTodayPromise(
        data as CustomerPaymentMessageInputMap["reminder_after_today_promise"],
      );
    case customerPaymentMessageIds.reminder_after_week_promise:
      return renderReminderAfterWeekPromise(
        data as CustomerPaymentMessageInputMap["reminder_after_week_promise"],
      );
    case customerPaymentMessageIds.recurring_reminder:
      return renderRecurringReminder(data as CustomerPaymentMessageInputMap["recurring_reminder"]);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
