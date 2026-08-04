"use client";

import { useState } from "react";
import { formatINR, timeAgo } from "@/lib/utils";
import { X, CheckCircle2, Loader2, IndianRupee } from "lucide-react";
import { CashRequest } from "@/frontend/hooks/useCashRequests";

interface CollectCashDialogProps {
  request: CashRequest;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function CollectCashDialog({ request, onClose, onConfirm }: CollectCashDialogProps) {
  const [loading, setLoading] = useState(false);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to confirm cash. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tables = request.session?.restaurant_tables;
  const tableNum = Array.isArray(tables) ? tables[0]?.table_number : tables?.table_number;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark border border-dark-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="font-display font-semibold text-lg text-white">Collect Cash</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IndianRupee className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-zinc-400 text-sm">Please collect</p>
            <p className="text-3xl font-bold text-white mt-1">{formatINR(request.amount)}</p>
            <p className="text-zinc-400 text-sm mt-1">from Table {tableNum || "—"}</p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-4 bg-brand text-brand-foreground hover:opacity-90 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Confirm Cash Received
          </button>
        </div>
      </div>
    </div>
  );
}
