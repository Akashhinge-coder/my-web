import { NotFoundError } from "@/backend/errors/NotFoundError";
import {
  mapHappyHour,
  mapHappyHourToPricingDiscount,
  type HappyHourDTO,
} from "@/backend/mappers/happy-hours.mapper";
import { HappyHoursRepository } from "@/backend/repositories/happy-hours.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type { HappyHourDiscount } from "@/types/pricing";
import type {
  HappyHourCreateDTO,
  HappyHourUpdateDTO,
} from "@/backend/validations/happy-hours.validation";

const DAY_BY_INDEX: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

export class HappyHoursService {
  static isWithinWindow(now: Date, startTime: string, endTime: string): boolean {
    const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return current >= startTime && current <= endTime;
  }

  static isActive(rule: HappyHourDTO, timestamp: Date | string = new Date()): boolean {
    if (!rule.isActive) return false;

    const activeAt = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const day = DAY_BY_INDEX[activeAt.getDay()];
    return rule.days.includes(day) && this.isWithinWindow(activeAt, rule.startTime, rule.endTime);
  }

  static async list(): Promise<HappyHourDTO[]> {
    const access = await resolveRestaurantAccess();
    const rows = await HappyHoursRepository.listByRestaurant(access.restaurantId);
    return rows.map(mapHappyHour);
  }

  static async create(dto: HappyHourCreateDTO): Promise<HappyHourDTO> {
    const access = await resolveRestaurantAccess();
    const row = await HappyHoursRepository.create(access.restaurantId, dto);
    return mapHappyHour(row);
  }

  static async update(happyHourId: string, dto: HappyHourUpdateDTO): Promise<HappyHourDTO> {
    const access = await resolveRestaurantAccess();
    const existing = await HappyHoursRepository.findById(access.restaurantId, happyHourId);
    if (!existing) throw new NotFoundError("Happy hour rule not found");

    const row = await HappyHoursRepository.update(access.restaurantId, happyHourId, dto);
    return mapHappyHour(row);
  }

  static async delete(happyHourId: string): Promise<void> {
    const access = await resolveRestaurantAccess();
    const existing = await HappyHoursRepository.findById(access.restaurantId, happyHourId);
    if (!existing) throw new NotFoundError("Happy hour rule not found");

    await HappyHoursRepository.delete(access.restaurantId, happyHourId);
  }

  static toPricingRules(
    happyHours: HappyHourDTO[],
    timestamp: Date | string = new Date()
  ): HappyHourDiscount[] {
    return happyHours
      .filter((rule) => this.isActive(rule, timestamp))
      .map((rule) => mapHappyHourToPricingDiscount(rule, timestamp));
  }
}
