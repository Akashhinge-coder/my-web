import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Toast({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-dark-border bg-white p-3 text-sm shadow", className)} {...props} />;
}
