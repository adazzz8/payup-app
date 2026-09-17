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
  payup_intro: "payup_intro",
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

/** Shared clinic identification / first-contact framing for patient-facing SMS. */
export type ClinicMessageFraming = {
  /** When set, clinic identification line is included. Missing → legacy copy (no clinic line). */
  clinicDisplayName?: string | null;
  /** When true and clinicDisplayName is set, include the PayUp first-contact explanation. */
  isFirstPayUpContact?: boolean;
};

type WithClinicFraming = {
  clinic?: ClinicMessageFraming;
};

export type CustomerPaymentMessageInputMap = {
  first_payment_request: WithClinicFraming & {
    customerName: string;
    paymentLink: string;
    /** Prior calendar-day session in Asia/Jerusalem — shared backdated copy. */
    backdatedSession?: {
      appointmentDateDisplay: string;
      amountDigits: string;
    };
  };
  cumulative_balance_after_session: WithClinicFraming & {
    customerName: string;
    paymentLink: string;
    amountDigits: string;
    /** Prior calendar-day session in Asia/Jerusalem — shared backdated copy. */
    backdatedSession?: {
      appointmentDateDisplay: string;
    };
  };
  payment_reminder: WithClinicFraming & {
    customerName: string;
    paymentLink: string;
    sessionCount: number;
    amountDigits: string;
  };
  reminder_after_today_promise: WithClinicFraming & {
    customerName: string;
    paymentLink: string;
  };
  reminder_after_week_promise: WithClinicFraming & {
    customerName: string;
    paymentLink: string;
  };
  pay_now_admin_update: WithClinicFraming & {
    customerName: string;
    paymentLink: string;
  };
  recurring_reminder: WithClinicFraming & {
    customerName: string;
    paymentLink: string;
    sessionCount: number;
  };
  /** Pre-rendered by Base44; Core passes through after optional clinic preamble injection. */
  monthly_balance_request: WithClinicFraming & {
    messageText: string;
    paymentLink: string;
  };
  payup_intro: {
    customerName: string;
    clinicDisplayName: string;
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

const FIRST_CONTACT_INTRO =
  "הקליניקה התחילה להשתמש בשירותים של PayUp לצורך עדכוני תשלום וגבייה, ולכן מעכשיו הודעות בנושא עשויות להגיע אליך מכאן.";

function formatSessionLine(sessionCount: number): string {
  return sessionCount === 1 ? "עבור הפגישה האחרונה." : `עבור ${sessionCount} פגישות.`;
}

function resolvedClinicName(clinic?: ClinicMessageFraming): string | null {
  const name = clinic?.clinicDisplayName?.trim();
  return name && name.length > 0 ? name : null;
}

function buildClinicHeaderLines(clinic?: ClinicMessageFraming): string[] {
  const name = resolvedClinicName(clinic);
  if (!name) {
    return [];
  }
  const lines = [`הודעה מהקליניקה של ${name}.`, ""];
  if (clinic?.isFirstPayUpContact === true) {
    lines.push(FIRST_CONTACT_INTRO, "");
  }
  return lines;
}

function joinMessage(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => typeof p === "string").join("\n");
}

function renderBackdatedSessionPaymentRequest(input: {
  customerName: string;
  paymentLink: string;
  appointmentDateDisplay: string;
  amountDigits: string;
  clinic?: ClinicMessageFraming;
}): string {
  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return joinMessage([
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
    ]);
  }

  return joinMessage([
    `שלום ${input.customerName} 😊`,
    "",
    ...buildClinicHeaderLines(input.clinic),
    `קיבלנו עדכון על המפגש שלכם ב-${input.appointmentDateDisplay}.`,
    "",
    `היתרה המעודכנת כרגע היא ₪${input.amountDigits}.`,
    "",
    "מצרפים לך כאן לינק לתשלום או לעדכון, לנוחיותך.",
    "",
    "בקישור אפשר:",
    paymentLinkOptionsCompact,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ]);
}

function renderFirstPaymentRequest(input: CustomerPaymentMessageInputMap["first_payment_request"]): string {
  if (input.backdatedSession) {
    return renderBackdatedSessionPaymentRequest({
      customerName: input.customerName,
      paymentLink: input.paymentLink,
      appointmentDateDisplay: input.backdatedSession.appointmentDateDisplay,
      amountDigits: input.backdatedSession.amountDigits,
      clinic: input.clinic,
    });
  }

  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return joinMessage([
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
    ]);
  }

  return joinMessage([
    `שלום ${input.customerName} 😊`,
    "",
    ...buildClinicHeaderLines(input.clinic),
    "תודה שהיית היום ❤️",
    "",
    "מצרפים לך כאן לינק לתשלום או לעדכון, לנוחיותך.",
    "",
    "בקישור אפשר:",
    paymentLinkOptionsCompact,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ]);
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
      clinic: input.clinic,
    });
  }

  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return joinMessage([
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
    ]);
  }

  return joinMessage([
    `שלום ${input.customerName} 😊`,
    "",
    ...buildClinicHeaderLines(input.clinic),
    "תודה שהיית היום ❤️",
    "",
    "מצרפים לך כאן לינק לתשלום או לעדכון, לנוחיותך.",
    "",
    `לידיעתך, הסכום המצטבר כרגע, כולל פגישות קודמות, עומד על ₪${input.amountDigits}.`,
    "",
    "בקישור אפשר:",
    paymentLinkOptionsCompact,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ]);
}

function renderPaymentReminder(input: CustomerPaymentMessageInputMap["payment_reminder"]): string {
  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return joinMessage([
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
    ]);
  }

  return joinMessage([
    `שלום ${input.customerName} 😊`,
    "",
    ...buildClinicHeaderLines(input.clinic),
    "רק תזכורת קטנה.",
    "",
    `כרגע עדיין קיים חיוב פתוח בסך ₪${input.amountDigits}.`,
    "",
    formatSessionLine(input.sessionCount),
    "",
    "בקישור למטה אפשר לבחור איך להמשיך:",
    paymentLinkOptionsCompact,
    "",
    input.paymentLink,
    "",
    "תודה רבה 🙏",
  ]);
}

function renderReminderAfterTodayPromise(
  input: CustomerPaymentMessageInputMap["reminder_after_today_promise"],
): string {
  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return joinMessage([
      `היי ${input.customerName} 🙂`,
      "רק בודקת איתך שהתשלום הוסדר מאז אתמול.",
      "",
      "במידה ולא, מצרפת לך שוב את הלינק כאן לנוחותך:",
      input.paymentLink,
    ]);
  }

  return joinMessage([
    `היי ${input.customerName} 🙂`,
    "",
    ...buildClinicHeaderLines(input.clinic),
    "רק בודקים איתך שהתשלום הוסדר מאז אתמול.",
    "",
    "במידה ולא, מצרפים לך שוב את הלינק כאן לנוחותך:",
    input.paymentLink,
  ]);
}

function renderReminderAfterWeekPromise(
  input: CustomerPaymentMessageInputMap["reminder_after_week_promise"],
): string {
  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return joinMessage([
      `היי ${input.customerName} 🙂`,
      "רק בודקת איתך אם התשלום הוסדר במהלך השבוע.",
      "",
      "אם עדיין לא, מצרפת לך שוב את הלינק כאן לנוחיותך:",
      input.paymentLink,
    ]);
  }

  return joinMessage([
    `היי ${input.customerName} 🙂`,
    "",
    ...buildClinicHeaderLines(input.clinic),
    "רק בודקים איתך אם התשלום הוסדר במהלך השבוע.",
    "",
    "אם עדיין לא, מצרפים לך שוב את הלינק כאן לנוחיותך:",
    input.paymentLink,
  ]);
}

function renderPayNowAdminUpdate(input: CustomerPaymentMessageInputMap["pay_now_admin_update"]): string {
  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return joinMessage([
      `היי ${input.customerName} 🙂`,
      "רק כדי שאוכל לעשות סדר ברישומים, אשמח לעדכון באיזה אמצעי תשלום בחרת מתוך האפשרויות.",
      input.paymentLink,
      "תודה 🙏",
    ]);
  }

  return joinMessage([
    `היי ${input.customerName} 🙂`,
    "",
    ...buildClinicHeaderLines(input.clinic),
    "רק כדי שנוכל לעשות סדר ברישומים, נשמח לעדכון באיזה אמצעי תשלום בחרת מתוך האפשרויות.",
    input.paymentLink,
    "תודה 🙏",
  ]);
}

function renderRecurringReminder(input: CustomerPaymentMessageInputMap["recurring_reminder"]): string {
  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return joinMessage([
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
    ]);
  }

  return joinMessage([
    `שלום ${input.customerName} 😊`,
    "",
    ...buildClinicHeaderLines(input.clinic),
    "רק רצינו להזכיר שכרגע עדיין קיים חיוב פתוח.",
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
  ]);
}

function renderMonthlyBalanceRequest(
  input: CustomerPaymentMessageInputMap["monthly_balance_request"],
): string {
  const clinicName = resolvedClinicName(input.clinic);
  if (!clinicName) {
    return input.messageText;
  }

  const header = buildClinicHeaderLines(input.clinic);
  const text = input.messageText;
  const greetingMatch = text.match(/^(שלום[^\n]*|היי[^\n]*)\n\n?/);
  if (greetingMatch) {
    const greeting = greetingMatch[1];
    const rest = text.slice(greetingMatch[0].length);
    return joinMessage([greeting, "", ...header, rest]);
  }

  return joinMessage([...header, text]);
}

function renderPayupIntro(input: CustomerPaymentMessageInputMap["payup_intro"]): string {
  return joinMessage([
    `שלום ${input.customerName} 😊`,
    "",
    `הודעה מהקליניקה של ${input.clinicDisplayName}.`,
    "",
    "רצינו לעדכן שהקליניקה התחילה להשתמש בשירותים של PayUp לצורך עדכוני תשלום וגבייה.",
    "",
    "מעכשיו, הודעות בנושא תשלומים ועדכונים מהקליניקה עשויות להגיע אליך מכאן.",
    "",
    "המטרה היא להפוך את העדכון והתשלום לפשוטים ונוחים יותר.",
    "",
    "תודה רבה 🙏",
  ]);
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
    case customerPaymentMessageIds.payup_intro:
      return renderPayupIntro(data as CustomerPaymentMessageInputMap["payup_intro"]);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
