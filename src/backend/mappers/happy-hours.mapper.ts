import type { HappyHourDiscount } from "@/types/pricing";

export interface HappyHourRow {
  id: string;
  restaurant_id: string;
  name: string;
  discount_type: "flat" | "percent";
  discount_value: number | string;
  days: string[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  category_ids?: string[] | null;
  item_ids?: string[] | null;
}

export interface HappyHourDTO {
  id: string;
  name: string;
  discountType: "flat" | "percent";
  discountValue: number;
  days: string[];
  startTime: string;
  endTime: string;
  isActive: boolean;
  categoryIds: string[];
  itemIds: string[];
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

export function mapHappyHour(row: HappyHourRow): HappyHourDTO {
  return {
    id: row.id,
    name: row.name,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    days: row.days ?? [],
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    isActive: row.is_active,
    categoryIds: row.category_ids ?? [],
    itemIds: row.item_ids ?? [],
  };
}

export function mapHappyHourToPricingDiscount(
  happyHour: HappyHourDTO,
  timestamp: Date | string = new Date()
): HappyHourDiscount {
  const activeAt = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  const [startHour, startMin] = happyHour.startTime.split(':').map(Number);
  const startDate = new Date(activeAt);
  startDate.setHours(startHour, startMin, 0, 0);

  const [endHour, endMin] = happyHour.endTime.split(':').map(Number);
  const endDate = new Date(activeAt);
  endDate.setHours(endHour, endMin, 0, 0);

  if (happyHour.startTime > happyHour.endTime) {
    const current = `${String(activeAt.getHours()).padStart(2, "0")}:${String(activeAt.getMinutes()).padStart(2, "0")}`;
    if (current <= happyHour.endTime) {
      startDate.setDate(startDate.getDate() - 1);
    } else {
      endDate.setDate(endDate.getDate() + 1);
    }
  }

  return {
    id: happyHour.id,
    discountType: happyHour.discountType === "flat" ? "fixed" : "percentage",
    discountValue: happyHour.discountValue,
    startsAt: startDate.toISOString(),
    endsAt: endDate.toISOString(),
    percentage: happyHour.discountType === "percent" ? happyHour.discountValue : 0,
    itemIds: happyHour.itemIds,
    categoryIds: happyHour.categoryIds,
    isActive: happyHour.isActive,
    days: happyHour.days,
  };
}
