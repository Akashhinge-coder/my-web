import { ValidationError } from "@/backend/errors/ValidationError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { AuthError } from "@/backend/errors/AuthError";
import { ConflictError } from "@/backend/errors/ConflictError";
import { createAdminClient } from "@/config/supabase/server";
import { MenuRepository } from "@/backend/repositories/menu.repository";
import { OrderRepository, type ListOrdersScope } from "@/backend/repositories/order.repository";
import { SessionRepository } from "@/backend/repositories/session.repository";
import { TableRepository } from "@/backend/repositories/table.repository";
import { RestaurantRepository } from "@/backend/repositories/restaurant.repository";
import { CouponRepository } from "@/backend/repositories/coupon.repository";
import { SessionParticipantRepository } from "@/backend/repositories/session_participant.repository";
import { HappyHoursRepository } from "@/backend/repositories/happy-hours.repository";
import { LoyaltyRepository } from "@/backend/repositories/loyalty.repository";
import { mapCoupon, mapCouponToPricingDiscount } from "@/backend/mappers/coupon.mapper";
import { mapHappyHour } from "@/backend/mappers/happy-hours.mapper";
import { mapLoyaltyAccount, mapLoyaltyPricingInput } from "@/backend/mappers/loyalty.mapper";
import { HappyHoursService } from "@/backend/services/happy-hours.service";
import { LoyaltyService } from "@/backend/services/loyalty.service";
import {
  calculateOrderPricing,
  calculatePricingItemTotal,
  combineOrderPricing,
} from "@/backend/services/pricing.service";
import type {
  CreateOrderDTO,
  ListOrdersQuery,
  OrderPricingDTO,
  PlaceOrderDTO,
  UpdateOrderStatusDTO,
} from "@/backend/validations/order.schema";
import type { OrderStatus } from "@/types/domain";
import type { CouponDiscount, LoyaltyDiscount, OrderPricingDto, PricingItem } from "@/types/pricing";

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cooking", "cancelled"],
  cooking: ["served", "cancelled"],
  served: [],
  cancelled: [],
};

export class OrderService {
  static validateOrderItems(
    items: Array<{ dishId?: string; comboId?: string; itemType?: "dish" | "combo"; quantity: number }>,
    dishes: Array<{ id: string; name: string; categoryId: string; price: number; is_available: boolean }>,
    combos: Array<{ id: string; name: string; combo_price: number; is_active: boolean }> = []
  ) {
    const dishMap = new Map(dishes.map((d) => [d.id, d]));
    const comboMap = new Map(combos.map((c) => [c.id, c]));

    for (const item of items) {
      if (item.itemType === "combo") {
        if (!item.comboId) {
          throw new ValidationError("Missing comboId for item of type combo", {
            items: ["Missing comboId"],
          });
        }
        const combo = comboMap.get(item.comboId);
        if (!combo) {
          throw new ValidationError("One or more combos were not found", {
            items: [`Unknown combo: ${item.comboId}`],
          });
        }
        if (!combo.is_active) {
          throw new ValidationError("One or more combos are inactive", {
            items: [`Inactive combo: ${item.comboId}`],
          });
        }
      } else {
        if (!item.dishId) {
          throw new ValidationError("Missing dishId for item of type dish", {
            items: ["Missing dishId"],
          });
        }
        const dish = dishMap.get(item.dishId);
        if (!dish) {
          throw new ValidationError("One or more dishes were not found", {
            items: [`Unknown dish: ${item.dishId}`],
          });
        }
        if (!dish.is_available) {
          throw new ValidationError("One or more dishes are unavailable", {
            items: [`Unavailable: ${item.dishId}`],
          });
        }
      }
    }

    return { dishMap, comboMap };
  }

  private static toPricingItems(
    items: Array<{ dishId?: string; comboId?: string; itemType?: "dish" | "combo"; quantity: number }>,
    dishMap: Map<string, { id: string; categoryId: string; price: number }>,
    comboMap: Map<string, { id: string; combo_price: number }>
  ): PricingItem[] {
    return items.map((item) => {
      if (item.itemType === "combo") {
        const combo = comboMap.get(item.comboId!)!;
        return {
          id: combo.id,
          unitPrice: Number(combo.combo_price),
          quantity: item.quantity,
        };
      } else {
        const dish = dishMap.get(item.dishId!)!;
        return {
          id: dish.id,
          categoryId: dish.categoryId,
          unitPrice: Number(dish.price),
          quantity: item.quantity,
        };
      }
    });
  }

  private static async getCouponInput(
    restaurantId: string,
    couponCode?: string
  ): Promise<CouponDiscount | null> {
    if (!couponCode) return null;

    const row = await CouponRepository.findByCode(restaurantId, couponCode);
    if (!row) {
      throw new ValidationError("Coupon not found", { couponCode: ["Coupon not found"] });
    }

    const coupon = mapCoupon(row);
    return mapCouponToPricingDiscount(coupon);
  }

  private static async getLoyaltyInput(
    restaurantId: string,
    dto: Pick<OrderPricingDTO, "loyaltyPhone" | "loyaltyPointsToRedeem">
  ): Promise<LoyaltyDiscount | null> {
    if (!dto.loyaltyPhone || !dto.loyaltyPointsToRedeem) return null;

    const row = await LoyaltyRepository.findAccountByPhone(restaurantId, dto.loyaltyPhone);
    if (!row) {
      throw new ValidationError("Loyalty account not found", {
        loyaltyPhone: ["Loyalty account not found"],
      });
    }

    return mapLoyaltyPricingInput({
      account: mapLoyaltyAccount(row),
      pointsToRedeem: dto.loyaltyPointsToRedeem,
      settings: LoyaltyService.getSettings(),
    });
  }

  static async quotePricing(
    dto: OrderPricingDTO,
    restaurantId: string
  ): Promise<OrderPricingDto> {
    const dishIds = dto.items.filter((i) => i.itemType !== "combo").map((i) => i.dishId!).filter(Boolean);
    const comboIds = dto.items.filter((i) => i.itemType === "combo").map((i) => i.comboId!).filter(Boolean);

    const [dishes, combos] = await Promise.all([
      MenuRepository.findDishesByIds(restaurantId, dishIds),
      MenuRepository.findCombosByIds(restaurantId, comboIds),
    ]);

    const { dishMap, comboMap } = this.validateOrderItems(dto.items, dishes, combos);
    const restaurant = await RestaurantRepository.getSettingsById(restaurantId);
    const timestamp = dto.timestamp ?? new Date().toISOString();
    const happyHours = (await HappyHoursRepository.listByRestaurant(restaurantId)).map(mapHappyHour);

    return calculateOrderPricing({
      items: this.toPricingItems(dto.items, dishMap, comboMap),
      timestamp,
      coupon: await this.getCouponInput(restaurantId, dto.couponCode),
      loyaltyPoints: await this.getLoyaltyInput(restaurantId, dto),
      happyHours: HappyHoursService.toPricingRules(happyHours, timestamp),
      restaurantSettings: {
        cgstRate: Number(restaurant.cgst_rate),
        sgstRate: Number(restaurant.sgst_rate),
      },
    });
  }


  static async list(query: ListOrdersQuery & { restaurantId: string }) {
    const scope: ListOrdersScope = query.sessionId ? "session" : query.scope;
    return OrderRepository.listByRestaurant(query.restaurantId, {
      scope,
      sessionId: query.sessionId,
      statuses: scope === "kitchen" ? ["pending", "cooking"] : undefined,
    });
  }

  static async listBySession(sessionId: string, sessionToken?: string) {
    if (!sessionToken) {
      throw new AuthError("No dining session cookie found", 401, "UNAUTHORIZED_SESSION");
    }

    const participant = await SessionParticipantRepository.findByTokenGlobally(sessionToken);
    if (!participant || participant.session_id !== sessionId) {
      throw new AuthError("Dining session not found or unauthorized", 401, "UNAUTHORIZED_SESSION");
    }
    if (participant.status !== "approved") {
      throw new AuthError("You must be approved to view orders", 403, "UNAUTHORIZED_SESSION");
    }

    return OrderRepository.listBySession(sessionId);
  }

  static async create(dto: CreateOrderDTO, restaurantId: string) {
    const session = await SessionRepository.findById(dto.sessionId);
    if (!session || session.restaurant_id !== restaurantId) {
      throw new NotFoundError("Session not found for this restaurant");
    }

    return this.place(
      {
        tableId: session.table_id,
        sessionId: dto.sessionId,
        items: dto.items,
        notes: dto.notes,
        source: dto.source,
      },
      restaurantId,
      { sessionId: dto.sessionId }
    );
  }

  static async place(
    dto: PlaceOrderDTO,
    restaurantId: string,
    options?: { sessionId?: string; isCustomer?: boolean; sessionToken?: string }
  ) {
    const [table, restaurant] = await Promise.all([
      TableRepository.findById(dto.tableId),
      RestaurantRepository.getById(restaurantId),
    ]);

    if (!table || table.restaurant_id !== restaurantId) {
      throw new NotFoundError("Table not found for this restaurant");
    }
    if (!restaurant) {
      throw new NotFoundError("Restaurant not found");
    }

    const isCustomer = options?.isCustomer ?? false;

    let session = null;
    let createdSession = false;
    let placedByName = "Staff";
    let placedByParticipantId: string | null = null;

    if (isCustomer) {
      // ── CUSTOMER FLOW ─────────────────────────────────────────────────────────
      // Session ownership validation runs FIRST — before any menu lookups.
      // This ensures cross-restaurant and cross-table attacks receive the correct
      // rejection code without leaking dish membership information.

      const cookieToken = options?.sessionToken ?? null;

      if (!cookieToken) {
        console.warn("AUDIT FAILURE: missing session_token cookie", {
          tableId: dto.tableId,
          restaurantId,
        });
        throw new AuthError("No dining session cookie found", 401, "UNAUTHORIZED_SESSION");
      }

      // Resolve participant and their session from the token
      const participant = await SessionParticipantRepository.findByTokenGlobally(cookieToken);

      if (!participant || !participant.sessions) {
        console.warn("AUDIT FAILURE: participant_token cookie does not match any valid session", {
          tableId: dto.tableId,
          restaurantId,
        });
        throw new AuthError("Dining session not found or unauthorized", 401, "UNAUTHORIZED_SESSION");
      }

      const tokenSession = participant.sessions;

      // Prevent pending guests from ordering
      if (participant.status === "pending") {
        throw new AuthError("Your request is pending host approval", 403, "PENDING_APPROVAL");
      }

      if (participant.status !== "approved") {
        throw new AuthError("You are not approved to place orders", 403, "UNAUTHORIZED_SESSION");
      }

      placedByName = participant.name;
      placedByParticipantId = participant.id;

      // If dto.sessionId is supplied, it must exactly match the resolved session.
      const inputSessionId = dto.sessionId ?? null;
      if (inputSessionId && tokenSession.id !== inputSessionId) {
        console.warn("AUDIT FAILURE: sessionId payload does not match cookie session", {
          provided: inputSessionId,
          cookieSessionId: tokenSession.id,
          tableId: dto.tableId,
          restaurantId,
        });
        throw new AuthError("Dining session not found or unauthorized", 401, "UNAUTHORIZED_SESSION");
      }

      // Validate ownership — order matters: expiry → status → table → restaurant

      // Expired sessions: even if status is "active", reject if past expires_at
      if (tokenSession.expires_at && new Date(tokenSession.expires_at) < new Date()) {
        console.warn("AUDIT FAILURE: expired session", {
          sessionId: tokenSession.id,
          expiresAt: tokenSession.expires_at,
          tableId: dto.tableId,
          restaurantId,
        });
        throw new AuthError("Dining session has expired", 401, "EXPIRED_SESSION");
      }

      if (tokenSession.status !== "active") {
        console.warn("AUDIT FAILURE: attempting to order on non-active session", {
          sessionId: tokenSession.id,
          status: tokenSession.status,
          tableId: dto.tableId,
          restaurantId,
        });
        throw new ValidationError(`Orders cannot be placed on ${tokenSession.status} sessions`);
      }

      // Cross-restaurant: return opaque 404 — do not reveal session ownership details.
      // This check must come BEFORE table mismatch so a cross-restaurant attacker
      // gets 404, not a 422 that could leak which table a session belongs to.
      if (tokenSession.restaurant_id !== restaurantId) {
        console.warn("AUDIT FAILURE: restaurant mismatch", {
          sessionId: tokenSession.id,
          sessionRestaurantId: tokenSession.restaurant_id,
          requestRestaurantId: restaurantId,
          tableId: dto.tableId,
        });
        throw new NotFoundError("Session not found for this restaurant");
      }

      if (tokenSession.table_id !== dto.tableId) {
        console.warn("AUDIT FAILURE: table mismatch", {
          sessionId: tokenSession.id,
          sessionTableId: tokenSession.table_id,
          requestTableId: dto.tableId,
          restaurantId,
        });
        throw new ValidationError("Session does not belong to the specified table");
      }

      session = tokenSession;
    } else {
      // ── ADMIN / SYSTEM FLOW ───────────────────────────────────────────────────
      const resolvedSessionId = options?.sessionId ?? dto.sessionId ?? null;
      if (resolvedSessionId) {
        try {
          session = await SessionRepository.findById(resolvedSessionId);
        } catch {
          session = null;
        }
      } else {
        session = await SessionRepository.findActiveByTable(dto.tableId);
      }

      if (!session) {
        const newSession = await SessionRepository.create({
          restaurantId,
          tableId: dto.tableId,
          sessionModeSnapshot: restaurant.session_mode,
        });
        session = newSession;
        createdSession = true;
      }
    }

    // ── MENU + PRICING (runs after session validation) ─────────────────────────
    const dishIds = dto.items.filter((i) => i.itemType !== "combo").map((i) => i.dishId!).filter(Boolean);
    const comboIds = dto.items.filter((i) => i.itemType === "combo").map((i) => i.comboId!).filter(Boolean);

    const [dishes, combos] = await Promise.all([
      MenuRepository.findDishesByIds(restaurantId, dishIds),
      MenuRepository.findCombosByIds(restaurantId, comboIds),
    ]);

    const { dishMap, comboMap } = this.validateOrderItems(dto.items, dishes, combos);
    const pricing = await this.quotePricing({ items: dto.items }, restaurantId);

    if (createdSession && session) {
      await TableRepository.markOccupied(dto.tableId, session.id, restaurantId);
    }

    const sessionId = session.id;


    const order = await OrderRepository.create({
      sessionId,
      restaurantId,
      pricing,
      notes: dto.notes,
      source: dto.source,
      placedByName,
      placedByParticipantId,
    });

    await OrderRepository.createItems(
      dto.items.map((item) => {
        if (item.itemType === "combo") {
          const combo = comboMap.get(item.comboId!)!;
          const unitPrice = Number(combo.combo_price);
          return {
            orderId: order.id,
            dishId: null,
            comboId: item.comboId!,
            itemType: "combo" as const,
            itemName: combo.name,
            quantity: item.quantity,
            unitPrice,
            totalPrice: calculatePricingItemTotal({
              id: combo.id,
              unitPrice,
              quantity: item.quantity,
            }),
            notes: item.notes,
          };
        } else {
          const dish = dishMap.get(item.dishId!)!;
          const unitPrice = Number(dish.price);
          return {
            orderId: order.id,
            dishId: item.dishId!,
            comboId: null,
            itemType: "dish" as const,
            itemName: dish.name,
            quantity: item.quantity,
            unitPrice,
            totalPrice: calculatePricingItemTotal({
              id: dish.id,
              categoryId: dish.categoryId,
              unitPrice,
              quantity: item.quantity,
            }),
            notes: item.notes,
          };
        }
      })
    );

    await SessionRepository.addToTotal(sessionId, pricing.grandTotal);

    return {
      order,
      sessionId,
    };

  }

  static async placeIdempotent(
    dto: PlaceOrderDTO,
    restaurantId: string,
    idempotencyKey: string,
    options?: { sessionId?: string; isCustomer?: boolean; sessionToken?: string }
  ) {
    const [table, restaurant] = await Promise.all([
      TableRepository.findById(dto.tableId),
      RestaurantRepository.getById(restaurantId),
    ]);

    if (!table || table.restaurant_id !== restaurantId) {
      throw new NotFoundError("Table not found for this restaurant");
    }
    if (!restaurant) {
      throw new NotFoundError("Restaurant not found");
    }

    const isCustomer = options?.isCustomer ?? false;
    let session = null;

    if (isCustomer) {
      const cookieToken = options?.sessionToken ?? null;
      if (!cookieToken) {
        throw new AuthError("No dining session cookie found", 401, "UNAUTHORIZED_SESSION");
      }
      const participant = await SessionParticipantRepository.findByTokenGlobally(cookieToken);
      if (!participant || !participant.sessions) {
        throw new AuthError("Dining session not found or unauthorized", 401, "UNAUTHORIZED_SESSION");
      }
      const tokenSession = participant.sessions;
      const inputSessionId = dto.sessionId ?? null;
      if (inputSessionId && tokenSession.id !== inputSessionId) {
        throw new AuthError("Dining session not found or unauthorized", 401, "UNAUTHORIZED_SESSION");
      }
      if (tokenSession.expires_at && new Date(tokenSession.expires_at) < new Date()) {
        throw new AuthError("Dining session has expired", 401, "UNAUTHORIZED_SESSION");
      }
      if (tokenSession.status !== "active") {
        throw new ValidationError("Dining session is not active");
      }
      if (tokenSession.restaurant_id !== restaurantId) {
        throw new NotFoundError("Session not found for this restaurant");
      }
      if (tokenSession.table_id !== dto.tableId) {
        throw new ValidationError("Session does not belong to the specified table");
      }
      session = tokenSession;
    } else {
      const resolvedSessionId = options?.sessionId ?? dto.sessionId ?? null;
      if (resolvedSessionId) {
        try {
          session = await SessionRepository.findById(resolvedSessionId);
        } catch {
          session = null;
        }
      } else {
        session = await SessionRepository.findActiveByTable(dto.tableId);
      }
      if (!session) {
        session = await SessionRepository.create({
          restaurantId,
          tableId: dto.tableId,
          sessionModeSnapshot: restaurant.session_mode,
        });
        await TableRepository.markOccupied(dto.tableId, session.id, restaurantId);
      }
    }

    const sessionId = session.id;

    // Generate request hash
    const crypto = await import("crypto");
    const requestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(dto))
      .digest("hex");

    const supabase = createAdminClient();
    const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

    let keyRecord = null;
    try {
      const { data, error } = await supabase
        .from("idempotency_keys")
        .insert({
          key: idempotencyKey,
          restaurant_id: restaurantId,
          session_id: sessionId,
          request_hash: requestHash,
          status: "started",
          expires_at: expiresAt,
        })
        .select("*")
        .single();

      if (error) throw error;
      keyRecord = data;
    } catch (err: any) {
      if (err.code === "23505") {
        // Retrieve and poll/wait
        let retries = 0;
        const maxRetries = 60; // 3 seconds total
        while (retries < maxRetries) {
          const { data, error } = await supabase
            .from("idempotency_keys")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .eq("session_id", sessionId)
            .eq("key", idempotencyKey)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            throw new ConflictError("Idempotency key expired or cleared.");
          }

          if (data.status === "completed") {
            if (data.request_hash !== requestHash) {
              throw new ConflictError("Idempotency key conflict: same key with different payload.");
            }
            return { status: 200, payload: data.response_payload };
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
          retries++;
        }
        throw new ConflictError("Concurrent request for this idempotency key is taking too long.");
      }
      throw err;
    }

    try {
      const result = await this.place(dto, restaurantId, options);

      const { error: updateErr } = await supabase
        .from("idempotency_keys")
        .update({
          status: "completed",
          response_payload: result,
        })
        .eq("id", keyRecord.id);

      if (updateErr) throw updateErr;

      return { status: 201, payload: result };
    } catch (placeErr) {
      await supabase
        .from("idempotency_keys")
        .delete()
        .eq("id", keyRecord.id);
      throw placeErr;
    }
  }

  static async updateStatus(restaurantId: string, orderId: string, dto: UpdateOrderStatusDTO) {
    const existing = await OrderRepository.findById(restaurantId, orderId);
    const currentStatus = existing.status as OrderStatus;
    const nextStatus = dto.status;

    if (!STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw new ValidationError(`Cannot transition from ${currentStatus} to ${nextStatus}`, {
        status: [`Invalid transition: ${currentStatus} → ${nextStatus}`],
      });
    }

    return OrderRepository.updateStatus(restaurantId, orderId, nextStatus);
  }

  static async getBill(slug: string, tableId: string) {
    const restaurant = await RestaurantRepository.getBySlug(slug);
    if (!restaurant) throw new NotFoundError("Restaurant not found");

    const table = await TableRepository.findById(tableId);
    if (!table || table.restaurant_id !== restaurant.id) {
      throw new NotFoundError("Table not found");
    }

    if (!table.current_session_id) {
      return {
        restaurant: {
          name: restaurant.name,
          gst_number: restaurant.gst_number,
          phone: restaurant.phone,
          cgst_rate: restaurant.cgst_rate,
          sgst_rate: restaurant.sgst_rate,
        },
        table: { table_number: table.table_number },
        orders: [],
        pricing: {
          subtotal: 0,
          couponDiscount: 0,
          loyaltyDiscount: 0,
          happyHourDiscount: 0,
          taxableAmount: 0,
          cgst: 0,
          sgst: 0,
          gst: 0,
          totalDiscount: 0,
          grandTotal: 0,
        },
      };
    }

    const orders = await OrderRepository.listForBill(table.current_session_id);
    const pricing = combineOrderPricing(
      orders.map((order) => ({
        subtotal: Number(order.subtotal ?? 0),
        couponDiscount: Number(order.coupon_discount ?? 0),
        loyaltyDiscount: Number(order.loyalty_discount ?? 0),
        happyHourDiscount: Number(order.happy_hour_discount ?? 0),
        taxableAmount: Number(order.taxable_amount ?? 0),
        cgst: Number(order.cgst ?? 0),
        sgst: Number(order.sgst ?? 0),
        gst: Number(order.gst ?? 0),
        totalDiscount: Number(order.total_discount ?? 0),
        grandTotal: Number(order.grand_total ?? order.total ?? 0),
      }))
    );

    return {
      restaurant: {
        name: restaurant.name,
        gst_number: restaurant.gst_number,
        phone: restaurant.phone,
        cgst_rate: restaurant.cgst_rate,
        sgst_rate: restaurant.sgst_rate,
      },
      table: { table_number: table.table_number },
      orders,
      pricing,
      sessionId: table.current_session_id,
    };
  }
}
