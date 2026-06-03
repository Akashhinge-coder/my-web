import {
  mapRestaurantSettings,
  mapSettingsProfile,
  mapSettingsTax,
  type RestaurantSettingsDTO,
} from "@/backend/mappers/settings.mapper";
import { RestaurantRepository } from "@/backend/repositories/restaurant.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type {
  SettingsProfileUpdateDTO,
  SettingsTaxUpdateDTO,
  SettingsUpdateDTO,
} from "@/backend/validations/settings.validation";

export class SettingsService {
  static async getSettings(): Promise<RestaurantSettingsDTO> {
    const access = await resolveRestaurantAccess();
    const row = await RestaurantRepository.getSettingsById(access.restaurantId);
    return mapRestaurantSettings(row);
  }

  static async updateSettings(dto: SettingsUpdateDTO): Promise<RestaurantSettingsDTO> {
    const access = await resolveRestaurantAccess();
    await RestaurantRepository.updateProfile(access.restaurantId, mapSettingsProfile(dto));
    const row = await RestaurantRepository.updateTax(access.restaurantId, mapSettingsTax(dto));
    return mapRestaurantSettings(row);
  }

  static async updateProfile(dto: SettingsProfileUpdateDTO): Promise<RestaurantSettingsDTO> {
    const access = await resolveRestaurantAccess();
    const row = await RestaurantRepository.updateProfile(access.restaurantId, dto);
    return mapRestaurantSettings(row);
  }

  static async updateTax(dto: SettingsTaxUpdateDTO): Promise<RestaurantSettingsDTO> {
    const access = await resolveRestaurantAccess();
    const row = await RestaurantRepository.updateTax(access.restaurantId, dto);
    return mapRestaurantSettings(row);
  }
}
