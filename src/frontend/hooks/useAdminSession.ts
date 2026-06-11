"use client";

import { useEffect, useState } from "react";
import { authApi, type AdminSession } from "@/frontend/api/auth.api";

export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchSession = () => {
      authApi
        .getSession()
        .then((data) => {
          if (active) setSession(data);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Unable to load admin session");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    fetchSession();

    if (typeof window !== "undefined") {
      window.addEventListener("settings-updated", fetchSession);
    }

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("settings-updated", fetchSession);
      }
    };
  }, []);

  return { session, loading, error };
}
