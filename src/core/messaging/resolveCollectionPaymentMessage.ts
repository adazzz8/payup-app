import {
  type CustomerPaymentMessageId,
  type CustomerPaymentMessageInputMap,
  isCustomerPaymentMessageId,
} from "@/core/messaging/buildCustomerPaymentMessage";
import { resolvePaymentLinkFromPayload } from "@/core/messaging/resolvePaymentLink";
import {
  formatIlsAmountDigitsForTemplate,
  parseNumericAmount,
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

export class CollectionMessageResolveError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNKNOWN_MESSAGE_TYPE"
      | "CUMULATIVE_AMOUNT_REQUIRED"
      | "PAYMENT_REMINDER_AMOUNT_REQUIRED"
      | "MONTHLY_MESSAGE_TEXT_REQUIRED",
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
  const paymentLink = resolvePaymentLinkFromPayload(input);

  switch (messageType) {
    case "first_payment_request":
      return {
        messageType,
        payload: { customerName, paymentLink },
      };
    case "cumulative_balance_after_session": {
      const amount = parseNumericAmount(input.totalAggregatedAmount);
      const amountDigits = formatIlsAmountDigitsForTemplate(amount);
      if (!amountDigits) {
        throw new CollectionMessageResolveError(
          "cumulative_balance_after_session requires a valid totalAggregatedAmount; amount will not be invented.",
          "CUMULATIVE_AMOUNT_REQUIRED",
        );
      }
      return {
        messageType,
        payload: { customerName, paymentLink, amountDigits },
      };
    }
    case "payment_reminder": {
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
        payload: {
          customerName,
          paymentLink,
          sessionCount: resolveSessionCount(input),
          amountDigits,
        },
      };
    }
    case "reminder_after_today_promise":
      return {
        messageType,
        payload: { customerName, paymentLink },
      };
    case "reminder_after_week_promise":
      return {
        messageType,
        payload: { customerName, paymentLink },
      };
    case "pay_now_admin_update":
      return {
        messageType,
        payload: { customerName, paymentLink },
      };
    case "recurring_reminder":
      return {
        messageType,
        payload: { customerName, paymentLink, sessionCount: resolveSessionCount(input) },
      };
    case "monthly_balance_request": {
      const messageText = input.messageText?.trim() ?? "";
      if (!messageText) {
        throw new CollectionMessageResolveError(
          "monthly_balance_request requires non-empty payload.messageText from Base44.",
          "MONTHLY_MESSAGE_TEXT_REQUIRED",
        );
      }
      return {
        messageType,
        payload: { messageText, paymentLink },
      };
    }
    default: {
      const _exhaustive: never = messageType;
      return _exhaustive;
    }
  }
}
