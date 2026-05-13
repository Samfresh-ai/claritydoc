import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "slate" | "green" | "amber" | "red" | "blue";

const tones: Record<BadgeTone, string> = {
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  blue: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
