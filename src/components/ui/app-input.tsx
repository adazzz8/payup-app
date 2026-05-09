import type { InputHTMLAttributes } from "react";

type AppInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function AppInput({ label, id, className, ...props }: AppInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2 text-right">
      <label className="text-sm font-medium text-foreground" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        dir="rtl"
        className={
          className ??
          "h-12 w-full rounded-xl border border-border bg-white px-3 text-right text-sm outline-none ring-brand/20 focus:ring-4"
        }
        {...props}
      />
    </div>
  );
}
