"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-sw";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return children;
}
