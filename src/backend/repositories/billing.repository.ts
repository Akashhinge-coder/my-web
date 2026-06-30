import { createAdminClient } from "@/config/supabase/server";
import type { PaymentMethod, UserRole } from "@/types/domain";
import type { BillingRestaurant, BillingSession } from "@/types/billing";

interface StaffAccessRow {
  id: string;
  restaurant_id: string;
  role: UserRole;
  restaurants?: BillingRestaurant | BillingRestaurant[] | null;
}

interface PaymentRow {
  id: string;
  session_id: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
}

const BILLING_ORDER_FIELDS = `
  id, order_number, total, subtotal, coupon_discount, loyalty_discount,
  happy_hour_discount, taxable_amount, cgst, sgst, gst, total_discount,
  grand_total, status,
  order_items(quantity, unit_price, item_name, item_type, combo_id)
`;

export class BillingRepository {
  static async getOwnedRestaurantForUser(userId: string): Promise<BillingRestaurant | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, phone, gst_number, cgst_rate, sgst_rate")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as BillingRestaurant | null;
  }

  static async getStaffAccessForUser(
    userId: string
  ): Promise<{ staffId: string; role: UserRole; restaurant: BillingRestaurant } | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("staff")
      .select(
        "id, restaurant_id, role, restaurants(id, name, slug, phone, gst_number, cgst_rate, sgst_rate)"
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    const row = data as unknown as StaffAccessRow | null;
    const restaurant = Array.isArray(row?.restaurants)
      ? row?.restaurants[0]
      : row?.restaurants;

    if (!row || !restaurant) return null;
    return { staffId: row.id, role: row.role, restaurant };
  }

  static async listActiveSessions(restaurantId: string): Promise<BillingSession[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, guest_count, started_at, total_amount, version,
        restaurant_tables(table_number),
        orders(${BILLING_ORDER_FIELDS})
      `)
      .eq("restaurant_id", restaurantId)
      .eq("status", "active")
      .order("started_at");

    if (error) throw error;
    return (data ?? []) as unknown as BillingSession[];
  }

  static async findActiveSession(
    restaurantId: string,
    sessionId: string
  ): Promise<BillingSession | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, guest_count, started_at, total_amount, version,
        restaurant_tables(table_number),
        orders(${BILLING_ORDER_FIELDS})
      `)
      .eq("restaurant_id", restaurantId)
      .eq("id", sessionId)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;
    return data as unknown as BillingSession | null;
  }

  static async hasPaymentForSession(sessionId: string): Promise<boolean> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("payments")
      .select("id, session_id")
      .eq("session_id", sessionId)
      .limit(1);

    if (error) throw error;
    return ((data ?? []) as PaymentRow[]).length > 0;
  }

  static async createPayment(params: {
    sessionId: string;
    restaurantId: string;
    method: PaymentMethod;
    amountPaid: number;
    amountDue: number;
    changeReturned: number;
    cgst: number;
    sgst: number;
    discountAmount: number;
    confirmedBy: string | null;
  }): Promise<{ id: string }> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("payments")
      .insert({
        session_id: params.sessionId,
        restaurant_id: params.restaurantId,
        method: params.method,
        amount_paid: params.amountPaid,
        amount_due: params.amountDue,
        change_returned: params.changeReturned,
        cgst: params.cgst,
        sgst: params.sgst,
        discount_amount: params.discountAmount,
        confirmed_by: params.confirmedBy,
        confirmed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return data as { id: string };
  }

  static async createInvoice(params: {
    paymentId: string;
    restaurantId: string;
    invoiceNumber: string;
    subtotal: number;
    cgst: number;
    sgst: number;
    discount: number;
    total: number;
  }): Promise<InvoiceRow> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        payment_id: params.paymentId,
        restaurant_id: params.restaurantId,
        invoice_number: params.invoiceNumber,
        subtotal: params.subtotal,
        cgst: params.cgst,
        sgst: params.sgst,
        discount: params.discount,
        total: params.total,
      })
      .select("id, invoice_number")
      .single();

    if (error) throw error;
    return data as InvoiceRow;
  }

  static async closeSession(restaurantId: string, sessionId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("sessions")
      .update({ 
        status: "closed", 
        closed_at: new Date().toISOString(),
        expires_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "active");

    if (error) throw error;
  }

  static async releaseTable(restaurantId: string, sessionId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ status: "available", current_session_id: null })
      .eq("restaurant_id", restaurantId)
      .eq("current_session_id", sessionId);

    if (error) throw error;
  }
}
