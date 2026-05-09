"use client";

import { useMemo } from "react";
import { useQuickAddStore } from "@/stores/quick-add.store";
import { recentProductsFallback } from "@/lib/products/recent-products.fallback";
import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";

export function QuickAddForm() {
  const { draft, setField, reset } = useQuickAddStore();

  const recentProducts = useMemo(() => recentProductsFallback.slice(0, 5), []);

  const onProductSelect = (productId: string) => {
    const selected = recentProductsFallback.find((item) => item.id === productId);
    if (!selected) {
      return;
    }

    setField("productOrService", selected.name);
    if (selected.defaultPrice !== null) {
      setField("amount", String(selected.defaultPrice));
    }
  };

  return (
    <form className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <AppInput
        label="למי זה?"
        placeholder="שם לקוח"
        value={draft.customerName}
        onChange={(event) => setField("customerName", event.target.value)}
      />
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="quick-product">
          מוצר/שירות
        </label>
        <input
          id="quick-product"
          className="h-12 w-full rounded-xl border border-border bg-white px-3 text-right text-sm outline-none ring-brand/20 focus:ring-4"
          placeholder="עיצוב לוגו"
          value={draft.productOrService}
          onChange={(event) => setField("productOrService", event.target.value)}
          list="quick-add-products"
        />
        <datalist id="quick-add-products">
          {recentProducts.map((item) => (
            <option key={item.id} value={item.name} />
          ))}
        </datalist>
        <div className="flex flex-wrap justify-end gap-2">
          {recentProducts.map((item) => (
            <button
              key={item.id}
              type="button"
              className="rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground"
              onClick={() => onProductSelect(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      <AppInput
        label="סכום (אופציונלי)"
        placeholder="₪0"
        inputMode="decimal"
        value={draft.amount}
        onChange={(event) => setField("amount", event.target.value)}
      />
      <AppInput
        label="טלפון (אופציונלי)"
        placeholder="050-1234567"
        inputMode="tel"
        value={draft.phone}
        onChange={(event) => setField("phone", event.target.value)}
      />
      <div className="flex items-center gap-2 pt-2">
        <AppButton type="button" tone="ghost" onClick={reset} className="flex-1">
          נקה
        </AppButton>
        <AppButton type="submit" className="flex-1">
          שמור טיוטה
        </AppButton>
      </div>
    </form>
  );
}
