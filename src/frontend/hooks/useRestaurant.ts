"use client";
import { createContext, useContext } from "react";
import type { Restaurant } from "@/types/domain";

export const RestaurantContext = createContext<Restaurant | null>(null);

export function useRestaurant() {
  return useContext(RestaurantContext);
}
