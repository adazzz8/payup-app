"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { navItems } from "@/config/navigation";
import { useUiStore } from "@/stores/ui.store";

export function BottomNavigation() {
  const pathname = usePathname();
  const openQuickAdd = useUiStore((state) => state.openQuickAdd);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-surface/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur">
      <ul className="grid grid-cols-5 gap-2 text-right">
        {navItems.map((item) => {
          const isActive = item.href
            ? pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))
            : false;

          const baseClass = cn(
            "flex min-h-12 w-full flex-col items-center justify-center rounded-xl text-[11px] font-medium transition-colors",
            item.isPrimary
              ? "bg-brand text-brand-foreground"
              : isActive
                ? "bg-surface-muted text-foreground"
                : "text-muted",
          );

          return (
            <li key={`${item.label}-${item.icon}`}>
              {item.action === "openQuickAdd" ? (
                <button type="button" onClick={openQuickAdd} className={baseClass}>
                  <span aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ) : (
                <Link href={item.href ?? "/"} className={baseClass}>
                  <span aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
