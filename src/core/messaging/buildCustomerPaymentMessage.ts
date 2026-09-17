/**
 * Sole public API for customer payment SMS copy.
 * Template bodies and render helpers are private to this module.
 */

const customerPaymentMessageIds = {
  first_payment_request: "first_payment_request",
  cumulative_balance_after_session: "cumulative_balance_after_session",
  payment_reminder: "payment_reminder",
  reminder_after_today_promise: "reminder_after_today_promise",
  reminder_after_week_promise: "reminder_after_week_promise",
  pay_now_admin_update: "pay_now_admin_update",
  recurring_reminder: "recurring_reminder",
  monthly_balance_request: "monthly_balance_request",
} as const;

export type CustomerPaymentMessageId =
  (typeof customerPaymentMessageIds)[keyof typeof customerPaymentMessageIds];

const customerPaymentMessageIdValues = Object.values(customerPaymentMessageIds);

export function isCustomerPaymentMessageId(value: string): value is CustomerPaymentMessageId {
  return (customerPaymentMessageIdValues as string[]).includes(value);
}

export function listCustomerPaymentMessageIds(): CustomerPaymentMessageId[] {
  return [...customerPaymentMessageIdValues];
}

export type CustomerPaymentMessageInputMap = {
  first_payment_request: {
    customerName: string;
    paymentLink: string;
    /** Prior calendar-day session in Asia/Jerusalem — shared backdated copy. */
    backdatedSession?: {
      appointmentDateDisplay: string;
      amountDigits: string;
    };
  };
  cumulative_balance_after_session: {
    customerName: string;
    paymentLink: string;
    amountDigits: string;
    /** Prior calendar-day session in Asia/Jerusalem — shared backdated copy. */
    backdatedSession?: {
      appointmentDateDisplay: string;
    };
  };
  payment_reminder: {
    customerName: string;
    paymentLink: string;
    sessionCount: number;
    amountDigits: string;
  };
  reminder_after_today_promise: {
    customerName: string;
    paymentLink: string;
  };
  reminder_after_week_promise: {
    customerName: string;
    paymentLink: string;
  };
  pay_now_admin_update: {
    customerName: string;
    paymentLink: string;
  };
  recurring_reminder: {
    customerName: string;
    paymentLink: string;
    sessionCount: number;
  };
  /** Pre-rendered by Base44; Core passes through after validation. */
  monthly_balance_request: {
    messageText: string;
    paymentLink: string;
  };
};

/** Compact options block (approved collection templates). */
const paymentLinkOptionsCompact = [
  "✅ לשלם עכשיו",
  "✅ לעדכן שהתשלום כבר בוצע",
  "✅ לעדכן שהתשלום יבוצע בהמשך",
].join("\n");

/** Legacy spacing kept for payment_reminder / recurring_reminder (do not change copy). */
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

function renderBackdatedSessionPaymentRequest(input: {
  customerName: string;
  paymentLink: string;
  appointmentDateDisplay: string;
  amountDigits: string;
}): string {
  return [
    `שלום ${input.customerName} 😊`,
    "",
    `קיבלתי עדכון על המפגש שלכם ב-${input.appointmentDateDisplay}.`,
    "",
    `היתרה המעודכנת כרגע היא ₪${input.amountDigits}.`,
    "",
    "מצרפת לך כאן לינק לתשלום או לעדכון, לנוחיותך.",
    "",
    "בקישור אפשר:",
    paymentLinkOptionsCompact,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ].join("\n");
}

function renderFirstPaymentRequest(input: CustomerPaymentMessageInputMap["first_payment_request"]): string {
  if (input.backdatedSession) {
    return renderBackdatedSessionPaymentRequest({
      customerName: input.customerName,
      paymentLink: input.paymentLink,
      appointmentDateDisplay: input.backdatedSession.appointmentDateDisplay,
      amountDigits: input.backdatedSession.amountDigits,
    });
  }

  return [
    `שלום ${input.customerName} 😊`,
    "",
    "תודה שהיית היום ❤️",
    "",
    "מצרפת לך כאן לינק לתשלום או עדכון, לנוחיותך 🙂",
    "",
    "בקישור אפשר:",
    paymentLinkOptionsCompact,
    "",
    input.paymentLink,
    "",
    "תודה רבה,",
    "ושיהיה המשך יום נפלא 🙏",
  ].join("\n");
}

function renderCumulativeBalanceAfterSession(
  input: CustomerPaymentMessageInputMap["cumulative_balance_after_session"],
): string {
  if (input.backdatedSession) {
    return renderBackdatedSessionPaymentRequest({
      customerName: input.customerName,
      paymentLink: input.paymentLink,
      appointmentDateDisplay: input.backdatedSession.appointmentDateDisplay,
      amountDigits: input.amountDigits,
    });
  }

  return [
    `שלום ${input.customerName} 😊`,
    "",
    "תודה שהיית היום ❤️",
    "",
    "מצרפת לך כאן לינק לתשלום או עדכון, לנוחיותך 🙂",
    "",
    `לידיעתך, הסכום המצטבר כרגע, כולל פגישות קודמות, עומד על ₪${input.amountDigits}.`,
    "",
    "בקישור אפשר:",
    paymentLinkOptionsCompact,
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
    "רק תזכורת קטנה",
    "",
    `כרגע עדיין קיים חיוב פתוח בסך ₪${input.amountDigits}.`,
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
    `היי ${input.customerName} 🙂`,
    "רק בודקת איתך שהתשלום הוסדר מאז אתמול.",
    "",
    "במידה ולא, מצרפת לך שוב את הלינק כאן לנוחותך:",
    input.paymentLink,
  ].join("\n");
}

function renderReminderAfterWeekPromise(
  input: CustomerPaymentMessageInputMap["reminder_after_week_promise"],
): string {
  return [
    `היי ${input.customerName} 🙂`,
    "רק בודקת איתך אם התשלום הוסדר במהלך השבוע.",
    "",
    "אם עדיין לא, מצרפת לך שוב את הלינק כאן לנוחיותך:",
    input.paymentLink,
  ].join("\n");
}

function renderPayNowAdminUpdate(input: CustomerPaymentMessageInputMap["pay_now_admin_update"]): string {
  return [
    `היי ${input.customerName} 🙂`,
    "רק כדי שאוכל לעשות סדר ברישומים, אשמח לעדכון באיזה אמצעי תשלום בחרת מתוך האפשרויות.",
    input.paymentLink,
    "תודה 🙏",
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

function renderMonthlyBalanceRequest(
  input: CustomerPaymentMessageInputMap["monthly_balance_request"],
): string {
  return input.messageText;
}

export function buildCustomerPaymentMessage<T extends CustomerPaymentMessageId>(
  type: T,
  data: CustomerPaymentMessageInputMap[T],
): string {
  switch (type) {
    case customerPaymentMessageIds.first_payment_request:
      return renderFirstPaymentRequest(data as CustomerPaymentMessageInputMap["first_payment_request"]);
    case customerPaymentMessageIds.cumulative_balance_after_session:
      return renderCumulativeBalanceAfterSession(
        data as CustomerPaymentMessageInputMap["cumulative_balance_after_session"],
      );
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
    case customerPaymentMessageIds.pay_now_admin_update:
      return renderPayNowAdminUpdate(data as CustomerPaymentMessageInputMap["pay_now_admin_update"]);
    case customerPaymentMessageIds.recurring_reminder:
      return renderRecurringReminder(data as CustomerPaymentMessageInputMap["recurring_reminder"]);
    case customerPaymentMessageIds.monthly_balance_request:
      return renderMonthlyBalanceRequest(data as CustomerPaymentMessageInputMap["monthly_balance_request"]);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
