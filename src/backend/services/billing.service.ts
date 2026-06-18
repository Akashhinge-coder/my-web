import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ValidationError } from "@/backend/errors/ValidationError";
import { ConflictError } from "@/backend/errors/ConflictError";
import { requireRole } from "@/backend/middleware/rbac.middleware";
import { BillingRepository } from "@/backend/repositories/billing.repository";
import { generateInvoiceNumber } from "@/backend/utils/gst";
import { combineOrderPricing } from "@/backend/services/pricing.service";
import type { PaymentConfirmationDTO } from "@/backend/validations/payment.schema";
import type { UserRole } from "@/types/domain";
import type {
  BillingDashboard,
  BillingPaymentResult,
  BillingRestaurant,
  BillingSession,
} from "@/types/billing";

export class BillingService {
  static async getDashboard(): Promise<BillingDashboard> {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return this.getDemoDashboard();
    }

    const access = await this.resolveBillingAccess();
    const sessions = await BillingRepository.listActiveSessions(access.restaurant.id);

    return {
      restaurant: access.restaurant,
      sessions: sessions.map((session) => this.withBill(session)),
    };
  }

  static async confirmPayment(dto: PaymentConfirmationDTO): Promise<BillingPaymentResult> {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return {
        sessionId: dto.sessionId,
        paymentId: "demo-payment",
        invoiceId: "demo-invoice",
        invoiceNumber: "DEMO-260530-1001",
        amountDue: dto.amountPaid ?? 1260,
        amountPaid: dto.amountPaid ?? 1260,
        changeReturned: 0,
        method: dto.method,
      };
    }

    const access = await this.resolveBillingAccess();
    const session = await BillingRepository.findActiveSession(access.restaurant.id, dto.sessionId);
    if (!session) {
      throw new NotFoundError("Active billing session not found");
    }

    const alreadyPaid = await BillingRepository.hasPaymentForSession(dto.sessionId);
    if (alreadyPaid) {
      throw new ConflictError("Already Paid");
    }

    const bill = this.calculateSessionBill(session);
    const amountPaid = dto.method === "cash" && dto.amountPaid !== undefined
      ? dto.amountPaid
      : bill.total;

    if (amountPaid < bill.total) {
      throw new ValidationError("Amount paid cannot be less than amount due", {
        amountPaid: ["Amount paid must cover the bill total"],
      });
    }

    const changeReturned = dto.method === "cash" ? Math.max(0, amountPaid - bill.total) : 0;

    let payment;
    try {
      payment = await BillingRepository.createPayment({
        sessionId: dto.sessionId,
        restaurantId: access.restaurant.id,
        method: dto.method,
        amountPaid,
        amountDue: bill.total,
        changeReturned,
        cgst: bill.cgst,
        sgst: bill.sgst,
        discountAmount: bill.totalDiscount,
        confirmedBy: access.staffId,
      });
    } catch (err: any) {
      if (err && err.code === "23505") {
        throw new ConflictError("Already Paid");
      }
      throw err;
    }

    let invoice;
    try {
      invoice = await BillingRepository.createInvoice({
        paymentId: payment.id,
        restaurantId: access.restaurant.id,
        invoiceNumber: generateInvoiceNumber(access.restaurant.slug),
        subtotal: bill.subtotal,
        cgst: bill.cgst,
        sgst: bill.sgst,
        discount: bill.totalDiscount,
        total: bill.total,
      });
    } catch (err: any) {
      if (err && err.code === "23505") {
        // Clean up the created payment to keep database state consistent
        const supabase = await createClient();
        await supabase.from("payments").delete().eq("id", payment.id);
        throw new ConflictError("Already Paid");
      }
      throw err;
    }

    await BillingRepository.closeSession(access.restaurant.id, dto.sessionId);
    await BillingRepository.releaseTable(access.restaurant.id, dto.sessionId);

    return {
      sessionId: dto.sessionId,
      paymentId: payment.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amountDue: bill.total,
      amountPaid,
      changeReturned,
      method: dto.method,
    };
  }

  private static async resolveBillingAccess(): Promise<{
    restaurant: BillingRestaurant;
    staffId: string | null;
    role: UserRole;
  }> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

    const ownedRestaurant = await BillingRepository.getOwnedRestaurantForUser(user.id);
    if (ownedRestaurant) {
      return { restaurant: ownedRestaurant, staffId: null, role: "admin" };
    }

    const staffAccess = await BillingRepository.getStaffAccessForUser(user.id);
    if (!staffAccess) {
      throw new AuthError("Billing access required", 403, "FORBIDDEN");
    }

    requireRole(staffAccess.role, ["admin", "manager"]);
    return {
      restaurant: staffAccess.restaurant,
      staffId: staffAccess.staffId,
      role: staffAccess.role,
    };
  }

  private static withBill(session: BillingSession): BillingSession {
    return {
      ...session,
      bill: this.calculateSessionBill(session),
    };
  }

  public static calculateSessionBill(session: { orders: any[] }) {
    const pricing = combineOrderPricing(
      session.orders
        .filter((order) => order.status !== "cancelled")
        .map((order) => ({
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
      ...pricing,
      total: pricing.grandTotal,
    };
  }

  private static getDemoDashboard(): BillingDashboard {
    const restaurant: BillingRestaurant = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "MENUARA Demo Bistro",
      slug: "demo-bistro",
      phone: "9876543210",
      gst_number: "27ABCDE1234F1Z5",
      cgst_rate: 2.5,
      sgst_rate: 2.5,
    };

    const session: BillingSession = {
      id: "00000000-0000-4000-8000-000000000101",
      guest_count: 3,
      started_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      total_amount: 1200,
      restaurant_tables: { table_number: "T4" },
      orders: [
        {
          id: "00000000-0000-4000-8000-000000000201",
          order_number: "#D101",
          total: 720,
          subtotal: 720,
          coupon_discount: 0,
          loyalty_discount: 0,
          happy_hour_discount: 0,
          taxable_amount: 720,
          cgst: 18,
          sgst: 18,
          gst: 36,
          total_discount: 0,
          grand_total: 756,
          status: "served",
          order_items: [
            { quantity: 2, unit_price: 180, item_name: "Paneer Tikka", dishes: { name: "Paneer Tikka" } },
            { quantity: 1, unit_price: 360, item_name: "Veg Biryani", dishes: { name: "Veg Biryani" } },
          ],
        },
        {
          id: "00000000-0000-4000-8000-000000000202",
          order_number: "#D102",
          total: 480,
          subtotal: 480,
          coupon_discount: 0,
          loyalty_discount: 0,
          happy_hour_discount: 0,
          taxable_amount: 480,
          cgst: 12,
          sgst: 12,
          gst: 24,
          total_discount: 0,
          grand_total: 504,
          status: "served",
          order_items: [
            { quantity: 3, unit_price: 120, item_name: "Fresh Lime Soda", dishes: { name: "Fresh Lime Soda" } },
            { quantity: 1, unit_price: 120, item_name: "Gulab Jamun", dishes: { name: "Gulab Jamun" } },
          ],
        },
      ],
      bill: {
        subtotal: 0,
        couponDiscount: 0,
        loyaltyDiscount: 0,
        happyHourDiscount: 0,
        taxableAmount: 0,
        cgst: 0,
        sgst: 0,
        gst: 0,
        totalDiscount: 0,
        total: 0,
      },
    };

    return {
      restaurant,
      sessions: [this.withBill(session)],
    };
  }
}
