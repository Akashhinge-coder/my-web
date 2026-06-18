"use client";

import { useState, useEffect } from "react";

export interface SessionIdentity {
  id: string;
  name: string;
  role: "host" | "guest" | "staff";
  status: "pending" | "approved" | "denied" | "removed";
  sessionId: string;
  tableId: string;
  restaurantId: string;
  pendingGuests?: { id: string; name: string; phone?: string; created_at: string }[];
}

export function useSessionIdentity() {
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchIdentity() {
    try {
      const res = await fetch("/api/v1/sessions/me");
      const data = await res.json();
      if (data.success) {
        setIdentity(data.data);
      } else {
        setIdentity(null);
      }
    } catch (e) {
      setIdentity(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIdentity();
    
    // Poll every 5 seconds if the user is a host (to get pending guests)
    // or if they are pending (though WelcomePage handles pending, good to be safe)
    const interval = setInterval(fetchIdentity, 5000);
    return () => clearInterval(interval);
  }, []);

  const approveGuest = async (participantId: string, action: "approve" | "deny") => {
    try {
      const res = await fetch("/api/v1/guests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchIdentity(); // Refresh the list
      }
    } catch (e) {
      console.error("Failed to approve guest");
    }
  };

  return { identity, loading, fetchIdentity, approveGuest };
}
