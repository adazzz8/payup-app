export const locales = ["he", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "he";
