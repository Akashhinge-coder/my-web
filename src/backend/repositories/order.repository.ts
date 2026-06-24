import { createClient } from "@/config/supabase/server";
import { generateOrderNumber } from "@/lib/utils";
import type { OrderSource, OrderStatus } from "@/types/domain";

const ADMIN_ORDER_SELECT = `
  id, order_number, status, total, subtotal, coupon_discount, loyalty_discount,
  happy_hour_discount, taxable_amount, cgst, sgst, gst, total_discount,
  grand_total, created_at, source, notes, placed_by_name, placed_by_participant_id,
  sessions(table_id, restaurant_tables(table_number)),
  order_items(id, quantity, unit_price, notes, item_type, combo_id, item_name,
    dishes(id, name, food_type, image_url),
    combos(id, name, dish_ids))
`;

const KITCHEN_ORDER_SELECT = `
  id, order_number, status, total, grand_total, created_at, notes, placed_by_name,
  sessions(restaurant_tables(table_number), session_participants!sessions_host_participant_id_fkey(name)),
  order_items(id, quantity, notes, item_type, combo_id, item_name,
    dishes(name, food_type),
    combos(id, name, dish_ids))
`;

const CUSTOMER_ORDER_SELECT = `
  id, order_number, status, total, grand_total, created_at, placed_by_name, placed_by_participant_id,
  order_items(quantity, item_name, item_type, combo_id)
`;

const BILL_ORDER_SELECT = `
  order_number, status, total, subtotal, coupon_discount, loyalty_discount,
  happy_hour_discount, taxable_amount, cgst, sgst, gst, total_discount,
  grand_total,
  order_items(quantity, unit_price, item_name, item_type, combo_id)
`;

export type ListOrdersScope = "today" | "kitchen" | "session" | "all";

export interface CreateOrderRecordInput {
  sessionId: string;
  restaurantId: string;
  pricing: {
    subtotal: number;
    couponDiscount: number;
    loyaltyDiscount: number;
    happyHourDiscount: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    gst: number;
    totalDiscount: number;
    grandTotal: number;
  };
  notes?: string | null;
  source?: OrderSource;
  placedByName: string;
  placedByParticipantId?: string | null;
}

export interface CreateOrderItemInput {
  orderId: string;
  dishId: string | null;
  comboId?: string | null;
  itemType?: "dish" | "combo";
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
}

// Helper to normalize Supabase raw relational joins to domain Order model
function mapOrder(raw: any) {
  if (!raw) return raw;
  const mapped = { ...raw };

  if (mapped.order_items) {
    mapped.items = Array.isArray(mapped.order_items)
      ? mapped.order_items.map((item: any) => {
          const mappedItem = { ...item };
          if (mappedItem.dishes) {
            mappedItem.dish = Array.isArray(mappedItem.dishes) ? mappedItem.dishes[0] : mappedItem.dishes;
            delete mappedItem.dishes;
          }
          if (mappedItem.combos) {
            mappedItem.combo = Array.isArray(mappedItem.combos) ? mappedItem.combos[0] : mappedItem.combos;
            delete mappedItem.combos;
          }
          return mappedItem;
        })
      : mapped.order_items;
    delete mapped.order_items;
  }

  if (mapped.sessions) {
    const sessionObj = Array.isArray(mapped.sessions) ? mapped.sessions[0] : mapped.sessions;
    if (sessionObj) {
      mapped.session = { ...sessionObj };
      if (mapped.session.restaurant_tables) {
        mapped.session.table = Array.isArray(mapped.session.restaurant_tables)
          ? mapped.session.restaurant_tables[0]
          : mapped.session.restaurant_tables;
        delete mapped.session.restaurant_tables;
      }
      if (mapped.session.session_participants) {
        mapped.session.host_participant = Array.isArray(mapped.session.session_participants)
          ? mapped.session.session_participants[0]
          : mapped.session.session_participants;
        delete mapped.session.session_participants;
      }
    }
    delete mapped.sessions;
  }

  return mapped;
}

export class OrderRepository {
  static async create(record: CreateOrderRecordInput) {
    const { createAdminClient } = await import("@/config/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .insert({
        session_id: record.sessionId,
        restaurant_id: record.restaurantId,
        order_number: generateOrderNumber(),
        status: "pending",
        source: record.source ?? "table",
        total: record.pricing.grandTotal,
        subtotal: record.pricing.subtotal,
        coupon_discount: record.pricing.couponDiscount,
        loyalty_discount: record.pricing.loyaltyDiscount,
        happy_hour_discount: record.pricing.happyHourDiscount,
        taxable_amount: record.pricing.taxableAmount,
        cgst: record.pricing.cgst,
        sgst: record.pricing.sgst,
        gst: record.pricing.gst,
        total_discount: record.pricing.totalDiscount,
        grand_total: record.pricing.grandTotal,
        notes: record.notes ?? null,
        placed_by_name: record.placedByName,
        placed_by_participant_id: record.placedByParticipantId ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  static async createItems(items: CreateOrderItemInput[]) {
    if (items.length === 0) return [];
    const { createAdminClient } = await import("@/config/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("order_items")
      .insert(
        items.map((item) => ({
          order_id: item.orderId,
          dish_id: item.dishId,
          combo_id: item.comboId ?? null,
          item_type: item.itemType ?? "dish",
          item_name: item.itemName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          notes: item.notes ?? null,
          status: "pending",
        }))
      )
      .select("id");

    if (error) throw error;
    return data ?? [];
  }

  static async findById(restaurantId: string, orderId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, restaurant_id, status")
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateStatus(restaurantId: string, orderId: string, status: OrderStatus) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .select(ADMIN_ORDER_SELECT)
      .single();

    if (error) throw error;
    return mapOrder(data);
  }

  static async listByRestaurant(
    restaurantId: string,
    options: {
      scope?: ListOrdersScope;
      sessionId?: string;
      statuses?: OrderStatus[];
    } = {}
  ) {
    const supabase = await createClient();
    const scope = options.scope ?? "all";
    const select =
      scope === "kitchen" ? KITCHEN_ORDER_SELECT : scope === "session" ? CUSTOMER_ORDER_SELECT : ADMIN_ORDER_SELECT;

    let query = supabase.from("orders").select(select).eq("restaurant_id", restaurantId);

    if (options.sessionId) {
      query = query.eq("session_id", options.sessionId);
    }

    if (options.statuses?.length) {
      query = query.in("status", options.statuses);
    } else if (scope !== "kitchen") {
      query = query.neq("status", "cancelled");
    }

    if (scope === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("created_at", today);
    }

    if (scope === "kitchen") {
      query = query.in("status", ["pending", "cooking"]).order("created_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapOrder);
  }

  static async listBySession(sessionId: string) {
    const { createAdminClient } = await import("@/config/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select(CUSTOMER_ORDER_SELECT)
      .eq("session_id", sessionId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapOrder);
  }

  static async listForBill(sessionId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(BILL_ORDER_SELECT)
      .eq("session_id", sessionId)
      .neq("status", "cancelled");

    if (error) throw error;
    return (data ?? []).map(mapOrder);
  }
}
