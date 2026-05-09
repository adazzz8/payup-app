"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { QuickAddSheet } from "@/components/overlays/quick-add-sheet";
import { QueueIndicator } from "@/components/navigation/queue-indicator";

export function MobileAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNavigation = pathname.startsWith("/send-queue");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background text-right">
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      {!hideNavigation && <BottomNavigation />}
      <QueueIndicator />
      <QuickAddSheet />
    </div>
  );
}
