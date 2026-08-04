"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/frontend/api/http";

export interface CashRequest {
  id: string;
  amount: number;
  created_at: string;
  session_id: string;
  session?: {
    restaurant_tables?: { table_number: string } | Array<{ table_number: string }>;
  };
}

export function useCashRequests(enabled = true) {
  const [requests, setRequests] = useState<CashRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await apiFetch<CashRequest[]>("/api/payments/cash-requests");
      setRequests(data || []);
    } catch (err) {
      console.error("Failed to fetch cash requests", err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    fetchRequests();
    
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchRequests();
      }
    }, 10000); // 10s poll
    
    return () => window.clearInterval(interval);
  }, [enabled, fetchRequests]);

  return { requests, loading, refresh: fetchRequests };
}
