import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost";
};

export function AppButton({ className, tone = "primary", ...props }: AppButtonProps) {
  return (
    <button
      className={cn(
        "h-11 rounded-xl px-4 text-sm font-medium transition-colors",
        tone === "primary"
          ? "bg-brand text-brand-foreground hover:bg-brand/90"
          : "border border-border bg-surface text-foreground hover:bg-surface-muted",
        className,
      )}
      {...props}
    />
  );
}
