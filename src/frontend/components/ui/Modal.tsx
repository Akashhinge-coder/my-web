import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Modal({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="dialog" className={cn("fixed inset-4 z-50 rounded-lg bg-white p-6 shadow-xl", className)} {...props} />;
}
