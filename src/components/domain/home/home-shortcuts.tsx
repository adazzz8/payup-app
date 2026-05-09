import Link from "next/link";

type HomeShortcutsProps = {
  pendingQueueCount: number;
};

export function HomeShortcuts({ pendingQueueCount }: HomeShortcutsProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">קיצורי דרך</h2>
        <span className="rounded-full bg-surface-muted px-2 py-1 text-xs text-foreground">
          {`ממתינים לשליחה: ${pendingQueueCount}`}
        </span>
      </div>
      <div className="mt-3">
        <Link href="/send-queue" className="inline-flex rounded-xl bg-brand px-3 py-2 text-sm font-medium text-brand-foreground">
          מעבר לרשימת שליחה
        </Link>
      </div>
    </section>
  );
}
