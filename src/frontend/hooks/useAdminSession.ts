"use client";

import { useEffect, useState } from "react";
import { authApi, type AdminSession } from "@/frontend/api/auth.api";

export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

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

    return () => {
      active = false;
    };
  }, []);

  return { session, loading, error };
}
