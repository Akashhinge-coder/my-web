import { NotFoundError } from "@/backend/errors/NotFoundError";
import { WaitlistRepository } from "@/backend/repositories/waitlist.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type { CreateWaitlistDTO, UpdateWaitlistStatusDTO } from "@/backend/validations/waitlist.validation";
import type { Waitlist } from "@/types/domain";
import type { WaitlistPageData } from "@/types/waitlist";

export class WaitlistService {
  static async getPageData(): Promise<WaitlistPageData> {
    const access = await resolveRestaurantAccess();
    const entries = await WaitlistRepository.listActive(access.restaurantId);
    return { restaurantName: access.restaurantName, entries };
  }

  static async addGuest(dto: CreateWaitlistDTO): Promise<Waitlist> {
    const access = await resolveRestaurantAccess();
    return WaitlistRepository.create(access.restaurantId, dto);
  }

  static async updateStatus(entryId: string, dto: UpdateWaitlistStatusDTO): Promise<Waitlist> {
    const access = await resolveRestaurantAccess();
    const existing = await WaitlistRepository.findById(access.restaurantId, entryId);
    if (!existing) throw new NotFoundError("Waitlist entry not found");
    return WaitlistRepository.updateStatus(access.restaurantId, entryId, dto);
  }

  static async notifyGuest(entryId: string): Promise<Waitlist> {
    return this.updateStatus(entryId, { status: "notified" });
  }

  static async seatGuest(entryId: string): Promise<Waitlist> {
    return this.updateStatus(entryId, { status: "seated" });
  }

  static async markLeft(entryId: string): Promise<Waitlist> {
    return this.updateStatus(entryId, { status: "left" });
  }
}
