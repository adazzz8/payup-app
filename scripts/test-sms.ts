import { sendCollectionSms } from "../src/core/messaging/sendCollectionSms";
import type { BuildCollectionMessageInput } from "../src/core/messaging/types";

async function main() {
  const realIsraeliPhone = process.env.PAYUP_TEST_SMS_PHONE;

  if (!realIsraeliPhone) {
    throw new Error("Missing PAYUP_TEST_SMS_PHONE in environment.");
  }

  const testPaymentLink = process.env.PAYUP_TEST_PAYMENT_LINK?.trim();
  if (!testPaymentLink) {
    throw new Error("Missing PAYUP_TEST_PAYMENT_LINK (full https URL from Base44 payment flow).");
  }
  if (!/^https:\/\//i.test(testPaymentLink)) {
    throw new Error("PAYUP_TEST_PAYMENT_LINK must start with https:// (matches production API validation).");
  }

  const payload: BuildCollectionMessageInput = {
    business: {
      id: "biz_test_1",
      businessName: "פיי-אפ בדיקות",
      businessType: "kiosk",
    },
    customer: {
      id: "customer_test_1",
      fullName: "לקוח בדיקה",
      phone: realIsraeliPhone,
    },
    debt: {
      id: "debt_test_1",
      totalAmount: 78,
      currency: "ILS",
      items: [
        {
          productName: "קפה קר",
          quantity: 2,
          unitPrice: 14,
          lineTotal: 28,
        },
        {
          productName: "כריך טונה",
          quantity: 1,
          unitPrice: 50,
          lineTotal: 50,
        },
      ],
    },
    paymentMethods: [
      {
        type: "bit",
        isActive: true,
        value: "054-0000000",
      },
      {
        type: "paybox",
        isActive: true,
        value: "https://payboxapp.page.link/test",
      },
      {
        type: "credit_link",
        isActive: false,
        value: null,
      },
    ],
    paymentLink: testPaymentLink,
    purchaseDateDisplay: "שלישי ה-7.5",
  };

  const result = await sendCollectionSms(payload);

  console.log("=== Generated Message ===");
  console.log(result.message.messageText);
  console.log("");
  console.log("=== Delivery Result ===");
  console.log(result.delivery);
  console.log("");
  console.log("Twilio SID:", result.delivery.sid);
}

main().catch((error) => {
  console.error("test-sms failed:", error);
  process.exit(1);
});
