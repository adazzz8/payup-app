import { resolvePayupIntroTiming } from "@/core/messaging/payupIntroDeliveryPolicy";
import type { PayupIntroDeliveryStore } from "@/core/messaging/payupIntroDeliveryStore";
import { renderPayupIntroMessage } from "@/core/messaging/payupIntroTemplate";

export const PAYUP_INTRO_MAX_ATTEMPTS = 3;

export type PayupIntroSendResult = {
  success: boolean;
  sid: string | null;
  error: string | null;
};

export type PayupIntroDeliveryResult = {
  status: "sent" | "scheduled" | "failed";
  renderedMessage: string;
  characterCount: number;
  scheduledFor: string | null;
  attempts: number;
  sid: string | null;
  error: string | null;
  duplicateSuppressed: boolean;
};

export type PayupIntroPreview = {
  messageType: "payup_intro";
  renderedMessage: string;
  characterCount: number;
  eligibleNow: boolean;
  scheduledFor: string | null;
};

export function previewPayupIntro(input: {
  customerName: string;
  clinicDisplayName: string;
  now?: Date;
}): PayupIntroPreview {
  const renderedMessage = renderPayupIntroMessage(input);
  const timing = resolvePayupIntroTiming(input.now ?? new Date());
  return {
    messageType: "payup_intro",
    renderedMessage,
    characterCount: renderedMessage.length,
    eligibleNow: timing.eligibleNow,
    scheduledFor: timing.scheduledFor,
  };
}

export async function deliverPayupIntro(input: {
  businessId: string;
  customerId: string;
  customerName: string;
  clinicDisplayName: string;
  phone: string;
  now?: Date;
  store: PayupIntroDeliveryStore;
  send: (message: { to: string; body: string }) => Promise<PayupIntroSendResult>;
}): Promise<PayupIntroDeliveryResult> {
  const renderedMessage = renderPayupIntroMessage(input);
  const characterCount = renderedMessage.length;
  const existing = await input.store.get(input.businessId, input.customerId);

  if (existing?.status === "sent") {
    return {
      status: "sent",
      renderedMessage: existing.messageText || renderedMessage,
      characterCount: (existing.messageText || renderedMessage).length,
      scheduledFor: null,
      attempts: existing.attempts,
      sid: existing.providerMessageId,
      error: null,
      duplicateSuppressed: true,
    };
  }

  if (existing && existing.attempts >= PAYUP_INTRO_MAX_ATTEMPTS && existing.status === "failed") {
    return {
      status: "failed",
      renderedMessage,
      characterCount,
      scheduledFor: null,
      attempts: existing.attempts,
      sid: null,
      error: existing.lastError ?? "PAYUP_INTRO_RETRY_EXHAUSTED",
      duplicateSuppressed: true,
    };
  }

  const timing = resolvePayupIntroTiming(input.now ?? new Date());
  if (!timing.eligibleNow) {
    await input.store.save({
      businessId: input.businessId,
      customerId: input.customerId,
      status: "scheduled",
      attempts: existing?.attempts ?? 0,
      lastError: existing?.lastError ?? null,
      scheduledFor: timing.scheduledFor,
      providerMessageId: null,
      messageText: renderedMessage,
    });
    return {
      status: "scheduled",
      renderedMessage,
      characterCount,
      scheduledFor: timing.scheduledFor,
      attempts: existing?.attempts ?? 0,
      sid: null,
      error: null,
      duplicateSuppressed: false,
    };
  }

  let attempts = existing?.attempts ?? 0;
  let lastError = existing?.lastError ?? null;

  while (attempts < PAYUP_INTRO_MAX_ATTEMPTS) {
    attempts += 1;
    await input.store.save({
      businessId: input.businessId,
      customerId: input.customerId,
      status: "pending",
      attempts,
      lastError,
      scheduledFor: null,
      providerMessageId: null,
      messageText: renderedMessage,
    });

    const sent = await input.send({ to: input.phone, body: renderedMessage });
    if (sent.success) {
      await input.store.save({
        businessId: input.businessId,
        customerId: input.customerId,
        status: "sent",
        attempts,
        lastError: null,
        scheduledFor: null,
        providerMessageId: sent.sid,
        messageText: renderedMessage,
      });
      return {
        status: "sent",
        renderedMessage,
        characterCount,
        scheduledFor: null,
        attempts,
        sid: sent.sid,
        error: null,
        duplicateSuppressed: false,
      };
    }

    lastError = sent.error ?? "TRANSPORT_FAILED";
    const exhausted = attempts >= PAYUP_INTRO_MAX_ATTEMPTS;
    await input.store.save({
      businessId: input.businessId,
      customerId: input.customerId,
      status: exhausted ? "failed" : "pending",
      attempts,
      lastError,
      scheduledFor: null,
      providerMessageId: null,
      messageText: renderedMessage,
    });
  }

  return {
    status: "failed",
    renderedMessage,
    characterCount,
    scheduledFor: null,
    attempts,
    sid: null,
    error: lastError,
    duplicateSuppressed: false,
  };
}
