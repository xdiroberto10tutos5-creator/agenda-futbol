import * as React from "react";
import { cn } from "@/lib/utils";

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3",
    icon: "h-9 w-9",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export { Button };