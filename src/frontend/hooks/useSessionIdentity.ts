"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/frontend/api/http";

export interface SessionIdentity {
  id: string;
  name: string;
  role: "host" | "guest" | "staff";
  status: "pending" | "approved" | "denied" | "removed";
  sessionId: string;
  tableId: string;
  restaurantId: string;
  sessionMode?: "open" | "host_approval";
  pendingGuests?: { id: string; name: string; phone?: string; created_at: string }[];
}

export function useSessionIdentity() {
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchIdentity() {
    try {
      const timestamp = Date.now();
      const data = await apiFetch<SessionIdentity>(`/api/v1/sessions/me?t=${timestamp}`);
      setIdentity(data);
    } catch (e) {
      console.error("fetchIdentity failed:", e);
      setIdentity(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIdentity();
  }, []);

  useEffect(() => {
    // Only poll if the user is a host AND the restaurant uses host_approval mode.
    // If it's an "open" session, guests join automatically, so no approval polling is needed!
    if (identity?.role === "host" && identity?.sessionMode === "host_approval") {
      const interval = setInterval(fetchIdentity, 5000);
      return () => clearInterval(interval);
    }
  }, [identity?.role, identity?.sessionMode]);

  const approveGuest = async (participantId: string, action: "approve" | "deny") => {
    try {
      await apiFetch("/api/v1/guests/approve", {
        method: "POST",
        body: JSON.stringify({ participantId, action }),
      });
      fetchIdentity(); // Refresh the list
    } catch (e) {
      console.error("Failed to approve guest:", e);
    }
  };

  return { identity, loading, fetchIdentity, approveGuest };
}
