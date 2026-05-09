"use client";

import { QuickAddForm } from "@/components/domain/quick-add/quick-add-form";
import { AppButton } from "@/components/ui/app-button";
import { useUiStore } from "@/stores/ui.store";

export function QuickAddSheet() {
  const { isQuickAddOpen, closeQuickAdd } = useUiStore();

  if (!isQuickAddOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/35">
      <button
        type="button"
        aria-label="סגור חלון הוספה מהירה"
        className="absolute inset-0 h-full w-full"
        onClick={closeQuickAdd}
      />
      <section className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-border bg-surface p-4 shadow-2xl">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">הוספה מהירה</h2>
          <AppButton type="button" tone="ghost" onClick={closeQuickAdd}>
            סגור
          </AppButton>
        </header>
        <QuickAddForm />
      </section>
    </div>
  );
}
