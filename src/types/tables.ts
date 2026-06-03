import type { Table } from "@/types/domain";

export interface TablesPageData {
  restaurantId: string;
  restaurantSlug: string;
  tables: Table[];
}
