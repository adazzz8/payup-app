import {
  type CustomerPaymentMessageId,
  type CustomerPaymentMessageInputMap,
  isCustomerPaymentMessageId,
} from "@/core/messaging/buildCustomerPaymentMessage";
import { resolvePaymentLinkFromPayload } from "@/core/messaging/resolvePaymentLink";
import type { BuildCollectionMessageInput } from "@/core/messaging/types";

const DEFAULT_MESSAGE_TYPE = "first_payment_request" as const satisfies CustomerPaymentMessageId;

function resolveMessageType(input: BuildCollectionMessageInput): CustomerPaymentMessageId {
  const raw = input.messageType?.trim();
  if (raw && isCustomerPaymentMessageId(raw)) {
    return raw;
  }
  return DEFAULT_MESSAGE_TYPE;
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

export function resolveCollectionPaymentMessage(input: BuildCollectionMessageInput): {
  messageType: CustomerPaymentMessageId;
  payload: CustomerPaymentMessageInputMap[CustomerPaymentMessageId];
} {
  const messageType = resolveMessageType(input);
  const customerName = input.customer.fullName?.trim() || "שם";
  const paymentLink = resolvePaymentLinkFromPayload(input);

  switch (messageType) {
    case "first_payment_request":
      return {
        messageType,
        payload: { customerName, paymentLink },
      };
    case "payment_reminder":
      return {
        messageType,
        payload: { customerName, paymentLink, sessionCount: resolveSessionCount(input) },
      };
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
    case "recurring_reminder":
      return {
        messageType,
        payload: { customerName, paymentLink, sessionCount: resolveSessionCount(input) },
      };
    default: {
      const _exhaustive: never = messageType;
      return _exhaustive;
    }
  }
}
