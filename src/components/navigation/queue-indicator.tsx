"use client";

import Link from "next/link";
import { useQueueStore } from "@/stores/queue.store";

export function QueueIndicator() {
  const pendingCount = useQueueStore((state) => state.pendingCount);

  if (pendingCount < 1) {
    return null;
  }

  return (
    <Link
      href="/send-queue"
      className="fixed bottom-24 left-4 z-30 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground shadow-lg"
    >
      {`רשימת שליחה (${pendingCount})`}
    </Link>
  );
}
