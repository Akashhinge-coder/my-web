import type { Reservation, Table, TableStatus } from "@/types/domain";

export interface ReservationWithTable extends Reservation {
  restaurant_tables?: { table_number: string } | null;
}

export interface ReservationTableOption {
  id: string;
  table_number: string;
  seating_capacity: number;
  status: TableStatus;
}

export interface ReservationsPageData {
  restaurantName: string;
  reservations: ReservationWithTable[];
  tables: ReservationTableOption[];
}
