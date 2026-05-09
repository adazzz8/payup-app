export type SmsSendInput = {
  toPhone: string;
  messageText: string;
};

export type SmsDeliveryResult = {
  success: boolean;
  providerMessageId: string | null;
  error: string | null;
};

export type SmsProvider = {
  send: (input: SmsSendInput) => Promise<SmsDeliveryResult>;
};
