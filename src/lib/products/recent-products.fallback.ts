import type { ProductRecent } from "@/types/product";

// Temporary fallback list until product queries are wired to auth/session-aware fetching.
export const recentProductsFallback: ProductRecent[] = [
  { id: "fallback-logo", name: "עיצוב לוגו", defaultPrice: 300 },
  { id: "fallback-web", name: "בניית אתר", defaultPrice: 1200 },
  { id: "fallback-consult", name: "ייעוץ", defaultPrice: 200 },
  { id: "fallback-social", name: "ניהול סושיאל", defaultPrice: 450 },
  { id: "fallback-translation", name: "תרגום", defaultPrice: 150 },
];
