import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("w-full rounded-lg border border-dark-border bg-white px-3 py-2 text-sm outline-none focus:border-brand", className)} {...props} />;
}
