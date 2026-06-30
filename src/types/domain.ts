/* ─────────────────────────────────────────
   MENUARA — Global TypeScript Types
───────────────────────────────────────── */

// ── Auth & Restaurants ──────────────────────────────────────

export type UserRole = "admin" | "manager" | "waiter" | "kitchen" | "superadmin";

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  gst_number: string | null;
  address: string | null;
  phone: string;
  logo_url: string | null;
  language: string;
  cgst_rate: number;   // default 2.5
  sgst_rate: number;   // default 2.5
  currency: string;    // INR
  is_active: boolean;
  session_mode: "open" | "host_approval";
  created_at: string;
}

export interface Staff {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  name: string;
  role: UserRole;
  phone: string | null;
  shift_start: string | null;
  shift_end: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Tables & Sessions ───────────────────────────────────────

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning" | "awaiting_payment";
export type TableType   = "regular" | "booth" | "outdoor" | "private";

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  seating_capacity: number;
  table_type: TableType;
  status: TableStatus;
  assigned_waiter_id: string | null;
  current_session_id: string | null;
  qr_url: string | null;
  qr_token: string | null;
  floor: string | null;
  created_at: string;
  // Relations
  assigned_waiter?: Staff;
  current_session?: Session;
}


export type SessionParticipantRole = "host" | "guest" | "staff";
export type SessionParticipantStatus = "pending" | "approved" | "denied" | "removed";

export interface SessionParticipant {
  id: string;
  session_id: string;
  participant_token: string;
  name: string;
  phone: string | null;
  role: SessionParticipantRole;
  status: SessionParticipantStatus;
  created_at: string;
  approved_at: string | null;
  left_at: string | null;
}

export type SessionStatus = "active" | "billing" | "closed";

export interface Session {
  id: string;
  restaurant_id: string;
  table_id: string;
  guest_count: number;
  status: SessionStatus;
  started_at: string;
  closed_at: string | null;
  total_amount: number;
  host_participant_id: string | null;
  session_mode_snapshot: "open" | "host_approval";
  version: number;
  // Relations
  table?: Table;
  orders?: Order[];
  host_participant?: SessionParticipant;
}

// ── Menu ────────────────────────────────────────────────────

export type FoodType = "veg" | "non_veg" | "vegan" | "jain";

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  name_hindi: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Dish {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  name_hindi: string | null;
  description: string | null;
  description_hindi: string | null;
  price: number;
  image_url: string | null;
  food_type: FoodType;
  spice_level: number;   // 0–5
  is_available: boolean;
  is_special: boolean;
  allergy_tags: string[];  // ["gluten", "nuts", "dairy", "eggs", "shellfish"]
  dish_size: "S" | "M" | "L";
  ar_enabled: boolean;
  sort_order: number;
  created_at: string;
  // Relations
  category?: Category;
  ar_asset?: DishARAsset;
  avg_rating?: number;
}

export interface DishARAsset {
  id: string;
  dish_id: string;
  angle_front: string | null;
  angle_back:  string | null;
  angle_left:  string | null;
  angle_right: string | null;
  angle_top:   string | null;
  is_published: boolean;
  updated_at: string;
}

export interface Combo {
  id: string;
  restaurant_id: string;
  name: string;
  combo_price: number;
  dish_ids: string[];
  savings_amount: number;
  is_active: boolean;
}

// ── Orders ──────────────────────────────────────────────────

export type OrderStatus  = "pending" | "cooking" | "served" | "cancelled";
export type OrderSource  = "table" | "zomato" | "swiggy";

export interface Order {
  id: string;
  session_id: string;
  restaurant_id: string;
  order_number: string;
  status: OrderStatus;
  source: OrderSource;
  confirmed_by: string | null;
  total: number;
  subtotal?: number;
  coupon_discount?: number;
  loyalty_discount?: number;
  happy_hour_discount?: number;
  taxable_amount?: number;
  cgst?: number;
  sgst?: number;
  gst?: number;
  total_discount?: number;
  grand_total?: number;
  notes: string | null;
  placed_by_name: string;
  placed_by_participant_id: string | null;
  created_at: string;
  // Relations
  items?: OrderItem[];
  session?: Session;
  confirmed_by_staff?: Staff;
  placed_by_participant?: SessionParticipant;
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string | null;
  combo_id?: string | null;
  item_type: "dish" | "combo";
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  status: OrderStatus;
  // Relations
  dish?: Dish;
  combo?: Combo;
}


// ── Payments & Billing ──────────────────────────────────────

export type PaymentMethod = "razorpay" | "cash" | "pos";
export type PaymentStatus = "created" | "pending" | "authorized" | "captured" | "failed" | "cancelled" | "expired" | "refunded";

export interface Payment {
  id: string;
  session_id: string;
  restaurant_id: string;
  attempt_number: number;
  payment_method: PaymentMethod;
  gateway: string | null;
  gateway_order_id: string | null;
  payment_status: PaymentStatus;
  amount: number;
  currency: string;
  bill_snapshot: any;
  bill_snapshot_version: number;
  bill_hash: string;
  receipt_snapshot?: any;
  receipt_number?: string;
  parent_payment_id?: string;
  session_version: number;
  failure_reason: string | null;
  expires_at: string;
  paid_at: string | null;
  recorded_by_staff_id: string | null;
  recorded_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;

  // Relations
  recorded_by_staff?: Staff;
  session?: Session;
}

export interface PaymentWebhookLog {
  id: string;
  gateway: string;
  event_id: string | null;
  event_type: string;
  gateway_payment_id: string | null;
  gateway_order_id: string | null;
  payload: any;
  signature: string | null;
  status: string;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
}

// ── Coupons ─────────────────────────────────────────────────

export interface Coupon {
  id: string;
  restaurant_id: string;
  code: string;
  type: "flat" | "percent";
  value: number;
  min_order: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

// ── Loyalty ─────────────────────────────────────────────────

export interface LoyaltyAccount {
  id: string;
  restaurant_id: string;
  phone: string;
  name: string | null;
  total_points: number;
  total_spent: number;
  visit_count: number;
  last_visited: string | null;
}

// ── Reservations & Waitlist ─────────────────────────────────

export type ReservationStatus = "confirmed" | "seated" | "cancelled" | "no_show";

export interface Reservation {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  reserved_at: string;
  notes: string | null;
  status: ReservationStatus;
}

export interface Waitlist {
  id: string;
  restaurant_id: string;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  joined_at: string;
  notified_at: string | null;
  status: "waiting" | "notified" | "seated" | "left";
}

// ── Inventory ───────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  ingredient_name: string;
  unit: string;
  current_qty: number;
  low_stock_alert: number;
  supplier_id: string | null;
  updated_at: string;
}

export interface Supplier {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

// ── Happy Hours ─────────────────────────────────────────────

export interface HappyHour {
  id: string;
  restaurant_id: string;
  name: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  days: string[];   // ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// ── Ratings ─────────────────────────────────────────────────

export interface Rating {
  id: string;
  restaurant_id: string;
  session_id: string;
  dish_id: string | null;
  overall_score: number;
  food_score: number;
  service_score: number;
  comment: string | null;
  created_at: string;
}

// ── Analytics ───────────────────────────────────────────────

export interface DailyStats {
  date: string;
  total_revenue: number;
  total_orders: number;
  total_covers: number;
  avg_order_value: number;
  upi_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  top_dish_id: string;
  top_dish_name: string;
  peak_hour: number;
}

// ── Cart (client-side only) ─────────────────────────────────

export interface CartItem {
  id: string; // dish ID or combo ID
  itemType: "dish" | "combo";
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  notes?: string;
}


export interface CartState {
  items: CartItem[];
  restaurantId: string;
  tableId: string;
  sessionId: string | null;
}

// ── UI Helpers ──────────────────────────────────────────────

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  duration?: number;
}

export interface OfflineAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: string;
  synced: boolean;
}
