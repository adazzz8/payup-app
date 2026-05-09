import twilio from "twilio";

export function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error("Twilio environment variables are missing.");
  }

  return {
    client: twilio(accountSid, authToken),
    fromPhone,
  };
}
