export type TwilioSendSmsInput = {
  to: string;
  body: string;
};

export type TwilioSendSmsResponse = {
  success: boolean;
  provider: "twilio";
  sid: string | null;
  status: string | null;
  error: string | null;
};
