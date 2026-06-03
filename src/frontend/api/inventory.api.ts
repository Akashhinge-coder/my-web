import { apiFetch } from "@/frontend/api/http";
import type { InventoryItem } from "@/types/domain";

export interface CreateInventoryBody {
  ingredient_name: string;
  unit: string;
  current_qty: number;
  low_stock_alert: number;
}

export interface UpdateInventoryBody {
  ingredient_name?: string;
  unit?: string;
  current_qty?: number;
  low_stock_alert?: number;
  delta?: number;
}

export const inventoryApi = {
  list(): Promise<InventoryItem[]> {
    return apiFetch<InventoryItem[]>("/api/v1/inventory");
  },

  create(body: CreateInventoryBody): Promise<InventoryItem> {
    return apiFetch<InventoryItem>("/api/v1/inventory", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  update(itemId: string, body: UpdateInventoryBody): Promise<InventoryItem> {
    return apiFetch<InventoryItem>(`/api/v1/inventory/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  adjustQuantity(itemId: string, delta: number): Promise<InventoryItem> {
    return apiFetch<InventoryItem>(`/api/v1/inventory/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ delta }),
    });
  },

  delete(itemId: string): Promise<void> {
    return apiFetch<void>(`/api/v1/inventory/${itemId}`, {
      method: "DELETE",
    });
  },
};

