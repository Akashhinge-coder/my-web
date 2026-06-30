import type { PaymentMethod } from "@/types/domain";

export interface BillingRestaurant {
  id: string;
  name: string;
  slug: string;
  phone: string;
  gst_number: string | null;
  cgst_rate: number;
  sgst_rate: number;
}

export interface BillingOrderItem {
  quantity: number;
  unit_price: number;
  item_name: string;
  item_type?: "dish" | "combo";
  combo_id?: string | null;
  dishes?: { name: string } | null;
}


export interface BillingOrder {
  id: string;
  order_number: string;
  total: number;
  subtotal: number;
  coupon_discount: number;
  loyalty_discount: number;
  happy_hour_discount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  gst: number;
  total_discount: number;
  grand_total: number;
  status: string;
  order_items: BillingOrderItem[];
}

export interface BillingSession {
  id: string;
  guest_count: number;
  version?: number;
  started_at: string;
  total_amount: number;
  restaurant_tables: { table_number: string } | null;
  orders: BillingOrder[];
  bill: {
    subtotal: number;
    couponDiscount: number;
    loyaltyDiscount: number;
    happyHourDiscount: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    gst: number;
    totalDiscount: number;
    total: number;
  };
}

export interface BillingDashboard {
  restaurant: BillingRestaurant;
  sessions: BillingSession[];
}

export interface BillingPaymentResult {
  sessionId: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  amountPaid: number;
  changeReturned: number;
  method: PaymentMethod;
}
