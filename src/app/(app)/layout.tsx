import type { ReactNode } from "react";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <MobileAppShell>{children}</MobileAppShell>;
}
