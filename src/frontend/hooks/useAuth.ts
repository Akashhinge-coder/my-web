"use client";
import { createContext, useContext } from "react";
import type { UserRole } from "@/types/domain";

export const AuthContext = createContext<{ userId: string; role: UserRole } | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}
