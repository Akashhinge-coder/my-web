import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ReservationsRepository } from "@/backend/repositories/reservations.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type {
  CreateReservationDTO,
  UpdateReservationStatusDTO,
} from "@/backend/validations/reservations.validation";
import type { ReservationsPageData, ReservationWithTable } from "@/types/reservations";

export class ReservationsService {
  static async getPageData(): Promise<ReservationsPageData> {
    const access = await resolveRestaurantAccess();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromISO = today.toISOString();

    const [requests, reservations, tables] = await Promise.all([
      ReservationsRepository.findRequested(access.restaurantId),
      ReservationsRepository.listUpcoming(access.restaurantId, fromISO),
      ReservationsRepository.listTablesForRestaurant(access.restaurantId),
    ]);

    return {
      restaurantName: access.restaurantName,
      requests,
      reservations,
      tables,
    };
  }

  static async create(dto: CreateReservationDTO): Promise<ReservationWithTable> {
    const access = await resolveRestaurantAccess();
    return ReservationsRepository.create(access.restaurantId, dto);
  }

  static async updateStatus(
    reservationId: string,
    dto: UpdateReservationStatusDTO
  ): Promise<ReservationWithTable> {
    const access = await resolveRestaurantAccess();
    const existing = await ReservationsRepository.findById(access.restaurantId, reservationId);
    if (!existing) throw new NotFoundError("Reservation not found");
    return ReservationsRepository.updateStatus(access.restaurantId, reservationId, dto);
  }
}
