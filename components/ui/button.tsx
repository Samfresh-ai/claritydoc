import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:outline-blue-700 disabled:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-50 focus-visible:outline-blue-700 disabled:text-slate-400",
  ghost:
    "text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-700 disabled:text-slate-400",
  danger:
    "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 focus-visible:outline-red-700 disabled:text-red-300",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
