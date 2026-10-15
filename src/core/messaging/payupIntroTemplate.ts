/**
 * Single source of truth for the payup_intro SMS body.
 * Preview and send must both call renderPayupIntroMessage.
 */

export const PAYUP_INTRO_TEMPLATE =
  "היי {{customerName}}, {{clinicDisplayName}} התחילה להשתמש ב-PayUp לניהול ועדכוני תשלומים. מעכשיו ייתכן שתקבל/י מ-PayUp הודעות הקשורות לתשלומים שלך בקליניקה. אין צורך לעשות דבר כרגע.";

export function renderPayupIntroMessage(input: {
  customerName: string;
  clinicDisplayName: string;
}): string {
  return PAYUP_INTRO_TEMPLATE.replaceAll("{{customerName}}", input.customerName.trim()).replaceAll(
    "{{clinicDisplayName}}",
    input.clinicDisplayName.trim(),
  );
}
