"use client";

import { formatINR } from "@/lib/utils";

// In a real implementation this would come from a context or fetch API
// For now, it's prepared to accept an array of payments for the session
interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  status: "Completed" | "Pending" | "Refunded";
  date: string;
}

export function PaymentsHistory({ payments }: { payments: PaymentRecord[] }) {
  if (!payments || payments.length === 0) return null;

  return (
    <div className="space-y-3 pt-6 border-t border-dark-border mt-6">
      <h3 className="font-display font-medium text-white/90 text-sm px-1">Payments</h3>
      
      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between items-center bg-dark border border-dark-border rounded-xl p-4">
            <div>
              <div className="font-medium text-white">{formatINR(p.amount)}</div>
              <div className="text-xs text-zinc-400">{p.method} • {p.date}</div>
            </div>
            
            <div className={`text-xs font-medium px-2 py-1 rounded-md ${
              p.status === "Completed" ? "bg-green-500/10 text-green-400" :
              p.status === "Refunded" ? "bg-zinc-500/10 text-zinc-400" :
              "bg-amber-500/10 text-amber-400"
            }`}>
              {p.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
