import {
  type ClinicMessageFraming,
  type CustomerPaymentMessageId,
  type CustomerPaymentMessageInputMap,
  isCustomerPaymentMessageId,
} from "@/core/messaging/buildCustomerPaymentMessage";
import { resolvePaymentLinkFromPayload } from "@/core/messaging/resolvePaymentLink";
import {
  formatIlsAmountDigitsForTemplate,
  parseNumericAmount,
  resolveBackdatedAppointmentDate,
  resolveDebtAmountForSms,
} from "@/core/messaging/templates";
import type { BuildCollectionMessageInput } from "@/core/messaging/types";

const DEFAULT_MESSAGE_TYPE = "first_payment_request" as const satisfies CustomerPaymentMessageId;

export type MessageTypeResolution =
  | { status: "missing"; messageType: typeof DEFAULT_MESSAGE_TYPE }
  | { status: "known"; messageType: CustomerPaymentMessageId }
  | { status: "unknown"; raw: string };

/**
 * Missing / empty → backward-compatible default.
 * Explicit unknown → unknown (caller must reject; no silent fallback).
 */
export function resolveMessageTypeField(raw: string | null | undefined): MessageTypeResolution {
  if (raw === null || raw === undefined) {
    return { status: "missing", messageType: DEFAULT_MESSAGE_TYPE };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { status: "missing", messageType: DEFAULT_MESSAGE_TYPE };
  }
  if (isCustomerPaymentMessageId(trimmed)) {
    return { status: "known", messageType: trimmed };
  }
  return { status: "unknown", raw: trimmed };
}

function resolveSessionCount(input: BuildCollectionMessageInput): number {
  if (typeof input.sessionCount === "number" && input.sessionCount > 0) {
    return Math.trunc(input.sessionCount);
  }

  const aggregatedItems = input.aggregatedItems ?? [];
  if (input.isAggregated === true && aggregatedItems.length > 0) {
    return aggregatedItems.length;
  }

  return 1;
}

function resolveClinicFraming(input: BuildCollectionMessageInput): ClinicMessageFraming | undefined {
  const clinicDisplayName = input.clinicDisplayName?.trim() || null;
  if (!clinicDisplayName) {
    return undefined;
  }
  return {
    clinicDisplayName,
    isFirstPayUpContact: input.isFirstPayUpContact === true,
  };
}

function withClinic<T extends object>(
  payload: T,
  clinic: ClinicMessageFraming | undefined,
): T & { clinic?: ClinicMessageFraming } {
  if (!clinic) {
    return payload;
  }
  return { ...payload, clinic };
}

export class CollectionMessageResolveError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNKNOWN_MESSAGE_TYPE"
      | "CUMULATIVE_AMOUNT_REQUIRED"
      | "PAYMENT_REMINDER_AMOUNT_REQUIRED"
      | "MONTHLY_MESSAGE_TEXT_REQUIRED"
      | "CLINIC_DISPLAY_NAME_REQUIRED"
      | "CUSTOMER_NAME_REQUIRED",
  ) {
    super(message);
    this.name = "CollectionMessageResolveError";
  }
}

export function resolveCollectionPaymentMessage(input: BuildCollectionMessageInput): {
  messageType: CustomerPaymentMessageId;
  payload: CustomerPaymentMessageInputMap[CustomerPaymentMessageId];
} {
  const typeResolution = resolveMessageTypeField(input.messageType ?? null);
  if (typeResolution.status === "unknown") {
    throw new CollectionMessageResolveError(
      `Unknown messageType: ${typeResolution.raw}`,
      "UNKNOWN_MESSAGE_TYPE",
    );
  }

  const messageType = typeResolution.messageType;
  const customerName = input.customer.fullName?.trim() || "שם";
  const clinic = resolveClinicFraming(input);

  switch (messageType) {
    case "payup_intro": {
      const clinicDisplayName = input.clinicDisplayName?.trim() ?? "";
      if (!clinicDisplayName) {
        throw new CollectionMessageResolveError(
          "payup_intro requires non-empty clinicDisplayName.",
          "CLINIC_DISPLAY_NAME_REQUIRED",
        );
      }
      const introCustomerName = input.customer.fullName?.trim() ?? "";
      if (!introCustomerName) {
        throw new CollectionMessageResolveError(
          "payup_intro requires non-empty customer.fullName.",
          "CUSTOMER_NAME_REQUIRED",
        );
      }
      return {
        messageType,
        payload: { customerName: introCustomerName, clinicDisplayName },
      };
    }
    case "first_payment_request": {
      const paymentLink = resolvePaymentLinkFromPayload(input);
      const backdated = resolveBackdatedAppointmentDate(input.appointmentDate);
      if (backdated) {
        const amountDigits = formatIlsAmountDigitsForTemplate(
          parseNumericAmount(input.totalAggregatedAmount),
        );
        if (!amountDigits) {
          throw new CollectionMessageResolveError(
            "backdated first_payment_request requires a valid totalAggregatedAmount; amount will not be invented.",
            "CUMULATIVE_AMOUNT_REQUIRED",
          );
        }
        return {
          messageType,
          payload: withClinic(
            {
              customerName,
              paymentLink,
              backdatedSession: {
                appointmentDateDisplay: backdated.appointmentDateDisplay,
                amountDigits,
              },
            },
            clinic,
          ),
        };
      }
      return {
        messageType,
        payload: withClinic({ customerName, paymentLink }, clinic),
      };
    }
    case "cumulative_balance_after_session": {
      const paymentLink = resolvePaymentLinkFromPayload(input);
      const amount = parseNumericAmount(input.totalAggregatedAmount);
      const amountDigits = formatIlsAmountDigitsForTemplate(amount);
      if (!amountDigits) {
        throw new CollectionMessageResolveError(
          "cumulative_balance_after_session requires a valid totalAggregatedAmount; amount will not be invented.",
          "CUMULATIVE_AMOUNT_REQUIRED",
        );
      }
      const backdated = resolveBackdatedAppointmentDate(input.appointmentDate);
      return {
        messageType,
        payload: withClinic(
          {
            customerName,
            paymentLink,
            amountDigits,
            ...(backdated
              ? {
                  backdatedSession: {
                    appointmentDateDisplay: backdated.appointmentDateDisplay,
                  },
                }
              : {}),
          },
          clinic,
        ),
      };
    }
    case "payment_reminder": {
      const paymentLink = resolvePaymentLinkFromPayload(input);
      // Primary SoT: totalAggregatedAmount. Debt fields only if that value is absent.
      const amount =
        parseNumericAmount(input.totalAggregatedAmount) ?? resolveDebtAmountForSms(input.debt);
      const amountDigits = formatIlsAmountDigitsForTemplate(amount);
      if (!amountDigits) {
        throw new CollectionMessageResolveError(
          "payment_reminder requires a valid totalAggregatedAmount (or debt outstanding amount); amount will not be invented.",
          "PAYMENT_REMINDER_AMOUNT_REQUIRED",
        );
      }
      return {
        messageType,
        payload: withClinic(
          {
            customerName,
            paymentLink,
            sessionCount: resolveSessionCount(input),
            amountDigits,
          },
          clinic,
        ),
      };
    }
    case "reminder_after_today_promise":
      return {
        messageType,
        payload: withClinic(
          { customerName, paymentLink: resolvePaymentLinkFromPayload(input) },
          clinic,
        ),
      };
    case "reminder_after_week_promise":
      return {
        messageType,
        payload: withClinic(
          { customerName, paymentLink: resolvePaymentLinkFromPayload(input) },
          clinic,
        ),
      };
    case "pay_now_admin_update":
      return {
        messageType,
        payload: withClinic(
          { customerName, paymentLink: resolvePaymentLinkFromPayload(input) },
          clinic,
        ),
      };
    case "recurring_reminder":
      return {
        messageType,
        payload: withClinic(
          {
            customerName,
            paymentLink: resolvePaymentLinkFromPayload(input),
            sessionCount: resolveSessionCount(input),
          },
          clinic,
        ),
      };
    case "monthly_balance_request": {
      const paymentLink = resolvePaymentLinkFromPayload(input);
      const messageText = input.messageText?.trim() ?? "";
      if (!messageText) {
        throw new CollectionMessageResolveError(
          "monthly_balance_request requires non-empty payload.messageText from Base44.",
          "MONTHLY_MESSAGE_TEXT_REQUIRED",
        );
      }
      return {
        messageType,
        payload: withClinic({ messageText, paymentLink }, clinic),
      };
    }
    default: {
      const _exhaustive: never = messageType;
      return _exhaustive;
    }
  }
}
