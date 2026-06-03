import { apiFetch } from "@/frontend/api/http";
import type { Table, TableStatus } from "@/types/domain";
import type { TablesPageData } from "@/types/tables";

export interface CreateTableBody {
  table_number: string;
  seating_capacity: number;
  table_type?: "regular" | "booth" | "outdoor" | "private";
  floor?: string | null;
}

export const tablesApi = {
  getPageData(): Promise<TablesPageData> {
    return apiFetch<TablesPageData>("/api/v1/tables");
  },

  create(body: CreateTableBody): Promise<Table> {
    return apiFetch<Table>("/api/v1/tables", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateStatus(tableId: string, status: TableStatus): Promise<Table> {
    return apiFetch<Table>(`/api/v1/tables/${tableId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  delete(tableId: string): Promise<void> {
    return apiFetch<void>(`/api/v1/tables/${tableId}`, {
      method: "DELETE",
    });
  },
};

