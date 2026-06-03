# MENUARA Architecture Guide

## Overview

MENUARA is a production-grade, multi-tenant restaurant SaaS platform built with:
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + realtime)
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript + Zod validation
- **Architecture**: Controller → Service → Repository (CSR)

This document explains the architecture and how everything connects.

---

## Architecture Layers

### 1️⃣ **Presentation Layer** (`src/app/`)
- **Purpose**: Next.js routing only (thin layer)
- **Rule**: No business logic here
- **Structure**:
  ```
  src/app/
  ├── (auth)/              — Public auth routes
  ├── (customer)/          — Customer-facing QR ordering
  ├── (admin)/             — Admin dashboard with auth
  ├── (platform)/          — Superadmin platform
  ├── api/                 — Next.js Route Handlers
  └── layout.tsx           — Root layout
  ```
- **Files**: Page components render UI, delegate requests to backend controllers
- **Example**: `/app/api/v1/orders/route.ts` → calls `orderController.createOrder()`

### 2️⃣ **API Layer** (`src/app/api/v1/`)
- **Purpose**: HTTP request/response orchestration
- **Pattern**: Thin route handlers that delegate to controllers
- **Endpoints**:
  ```
  POST   /api/v1/orders       — Create new order
  GET    /api/v1/orders       — List restaurant orders
  GET    /api/v1/menu         — Get menu with dishes
  POST   /api/v1/payments     — Process payment
  GET    /api/v1/restaurants  — Get restaurant info
  ```
- **Response Format**:
  ```typescript
  // Success
  { data: { ... } }
  
  // Error
  { error: { code: "INVALID_INPUT", message: "...", details: {...} } }
  ```

### 3️⃣ **Controller Layer** (`src/backend/controllers/`)
- **Purpose**: Request validation & response orchestration
- **Responsibility**:
  - Extract & validate request data
  - Call appropriate service method
  - Format response for HTTP
  - Handle errors (convert to HTTP status codes)
- **Files**: `order.controller.ts`, `menu.controller.ts`, `billing.controller.ts`, etc.
- **Example**:
  ```typescript
  export async function createOrder(req: NextRequest, restaurantId: string) {
    const payload = await req.json();
    const validated = createOrderSchema.parse(payload);
    const order = await OrderService.create(restaurantId, validated);
    return NextResponse.json({ data: order });
  }
  ```

### 4️⃣ **Service Layer** (`src/backend/services/`)
- **Purpose**: Core business logic & orchestration
- **Responsibility**:
  - Execute business rules
  - Coordinate between repositories
  - Handle calculations (GST, discounts, loyalty points)
  - Manage state transitions (order status, payment confirmation)
- **Files**: 11 comprehensive services
  - `order.service.ts` — Order lifecycle (create, confirm, cook, serve, cancel)
  - `menu.service.ts` — Menu CRUD, category management
  - `billing.service.ts` — GST calculation, invoice generation
  - `coupon.service.ts` — Coupon validation & usage tracking
  - `loyalty.service.ts` — Points calculation & redemption
  - `happy-hours.service.ts` — Time-based discount evaluation
  - `inventory.service.ts` — Stock decrement, low-stock alerts
  - `ar.service.ts` — AR asset management
  - `analytics.service.ts` — Revenue aggregation, peak hours
  - `restaurant.service.ts` — Onboarding, settings
  - `notification.service.ts` — WhatsApp, push dispatch
- **Example**:
  ```typescript
  export class OrderService {
    static async create(restaurantId: string, data: CreateOrderDTO) {
      // Validate menu items exist
      // Check inventory
      // Calculate pricing
      // Apply discounts/coupons
      // Create order in DB
      // Trigger notifications
      return createdOrder;
    }
  }
  ```

### 5️⃣ **Repository Layer** (`src/backend/repositories/`)
- **Purpose**: Database access & data mapping
- **Responsibility**:
  - Execute SQL queries via Supabase
  - Filter by restaurant (multi-tenant isolation)
  - Map database rows to domain objects via `src/backend/mappers/` (e.g. `menu.mapper.ts`)
  - Handle transactions
- **Files**:
  - `order.repository.ts` — All order queries
  - `menu.repository.ts` — Menu & dishes
  - `payment.repository.ts` — Payments & invoices
  - `restaurant.repository.ts` — Restaurant & staff
  - `analytics.repository.ts` — Aggregation queries
  - `loyalty.repository.ts` — Loyalty accounts
  - `table.repository.ts` — Table sessions
- **Example**:
  ```typescript
  export class OrderRepository {
    static async create(restaurantId: string, data: OrderData) {
      const client = createAdminClient();
      const { data: order } = await client
        .from("orders")
        .insert({ restaurant_id: restaurantId, ...data })
        .select()
        .single();
      return order;
    }
  }
  ```
- **Tenant Isolation**: Every query filters `WHERE restaurant_id = ${restaurantId}`

### 6️⃣ **Middleware Layer** (`src/backend/middleware/`)
- **Purpose**: Cross-cutting concerns in request pipeline
- **Files**:
  - `auth.middleware.ts` — JWT verification, user context injection
  - `rbac.middleware.ts` — Role-based access control (admin, manager, waiter, kitchen)
  - `tenant.middleware.ts` — Restaurant ID extraction & isolation check
  - `validation.middleware.ts` — Zod schema validation gateway
  - `rateLimit.middleware.ts` — Per-IP and per-restaurant rate limiting
  - `logger.middleware.ts` — Request/response logging
- **Pattern**: Stack middleware in route handlers or create global middleware wrapper

### 7️⃣ **Validation Layer** (`src/backend/validations/`)
- **Purpose**: Input data validation (Zod schemas)
- **Files**: `order.schema.ts`, `menu.schema.ts`, `payment.schema.ts`, `restaurant.schema.ts`, etc.
- **Pattern**: Use in controllers and middleware
  ```typescript
  const createOrderSchema = z.object({
    items: z.array(z.object({
      dishId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })),
    couponCode: z.string().optional(),
  });
  
  const validated = createOrderSchema.parse(req.body);
  ```

### 8️⃣ **Error Handling** (`src/backend/errors/`)
- **Purpose**: Typed error classes for consistent error responses
- **Files**:
  - `AppError.ts` — Base error class
  - `AuthError.ts` — 401/403 unauthorized
  - `NotFoundError.ts` — 404 not found
  - `ValidationError.ts` — 422 validation errors
  - `handler.ts` — Central error handler
- **Usage**:
  ```typescript
  throw new NotFoundError("Order not found");
  throw new AuthError("Unauthorized access");
  throw new ValidationError("Invalid coupon code", { couponCode: "not_found" });
  ```

### 9️⃣ **Frontend Layer** (`src/frontend/`)
- **Purpose**: Reusable UI components & state management
- **Structure**:
  ```
  src/frontend/
  ├── components/
  │   ├── ui/           — Primitive design system
  │   ├── admin/        — Admin-specific components
  │   ├── customer/     — Customer app components
  │   ├── kitchen/      — Kitchen display components
  │   └── shared/       — Cross-context components
  ├── hooks/            — Custom React hooks
  └── providers/        — Context providers
  ```
- **Hooks**: `useCart`, `useRealtime`, `useAuth`, `useRestaurant`, `useOfflineQueue`, `useToast`
- **Providers**: `CartProvider`, `ToastProvider`, `RealtimeProvider`
- **Components**: Composable, responsive, accessible

### 🔟 **Configuration Layer** (`src/config/`)
- **Purpose**: App-wide configuration & factories
- **Files**:
  - `supabase.ts` — Client/server/admin Supabase instances
  - `constants.ts` — App-wide constants (GST rates, order limits, etc.)
  - `routes.ts` — Typed route constants
  - `features.ts` — Feature flags

### 1️⃣1️⃣ **Types Layer** (`src/types/`)
- **Purpose**: Global TypeScript definitions
- **Files**:
  - `database.ts` — Auto-generated Supabase types
  - `domain.ts` — Business entity interfaces
  - `api.ts` — API request/response types
  - `index.ts` — Barrel exports
- **Pattern**: Import from `@/types` for consistent typing

### 1️⃣2️⃣ **Utilities Layer** (`src/lib/`)
- **Purpose**: Framework-agnostic shared helpers
- **Files**:
  - `utils.ts` — Currency, date, formatting helpers
  - `cn.ts` — Tailwind class merger (for dynamic styles)
  - `validators.ts` — Phone, email, GST validators
  - `foodType.ts` — Food type helpers

---

## Data Flow Examples

### Example 1: Create Order (Customer)

```
1. Customer clicks "Place Order" in /[slug]/[tableId]/orders

2. Frontend → POST /api/v1/orders
   {
     "sessionId": "uuid",
     "items": [
       { "dishId": "uuid", "quantity": 2, "notes": "No onions" }
     ],
     "couponCode": "SAVE10"
   }

3. API Route Handler (/app/api/v1/orders/route.ts)
   ├─ Extract restaurantId from middleware context
   ├─ Call OrderController.createOrder()

4. Controller (order.controller.ts)
   ├─ Validate payload with createOrderSchema (Zod)
   ├─ Call OrderService.create(restaurantId, validatedData)

5. Service (order.service.ts)
   ├─ Fetch menu items from repository
   ├─ Validate inventory availability
   ├─ Calculate base price
   ├─ Apply coupon discount
   ├─ Calculate GST
   ├─ Call OrderRepository.create()
   ├─ Call InventoryService.decrementStock()
   ├─ Call NotificationService.sendWhatsAppNotification()
   ├─ Return order with calculated total

6. Repository (order.repository.ts)
   ├─ Insert order into DB: orders table
   ├─ Insert order items: order_items table
   ├─ Return inserted order

7. Controller receives order from service
   ├─ Format response
   ├─ Return NextResponse.json({ data: order })

8. Frontend receives response
   ├─ Update cart state (clear items)
   ├─ Navigate to /[slug]/[tableId]/orders
   ├─ Show success toast
```

### Example 2: Admin Views Orders (Real-time)

```
1. Admin opens /admin/orders (page.tsx)

2. Page mounts useRealtimeOrders() hook

3. Hook → Subscribe to Supabase realtime:
   channel: `restaurant:${restaurantId}:orders`

4. Service layer via AnalyticsService:
   ├─ Fetch all orders for restaurant (AnalyticsRepository)
   ├─ Group by status (pending, confirmed, cooking, served)
   ├─ Calculate metrics (avg time, peak hours)

5. Frontend receives data:
   ├─ Render order cards by status
   ├─ Listen for realtime updates
   ├─ When new order comes in → flash notification
   ├─ When order status changes → animate transition

6. Admin clicks "Confirm Order"
   ├─ Call POST /api/v1/orders/{orderId}/confirm
   ├─ OrderController validates restaurantId ownership
   ├─ OrderService updates order status
   ├─ Repository updates DB
   ├─ Notification sent to customer
   ├─ Kitchen display updates via realtime
```

---

## Tenant Isolation (Multi-Restaurant)

Every query must filter by `restaurant_id`:

```typescript
// ✅ CORRECT: Isolated to restaurant
const orders = await db
  .from("orders")
  .select("*")
  .eq("restaurant_id", restaurantId);

// ❌ WRONG: Could leak data across restaurants
const orders = await db
  .from("orders")
  .select("*");

// ✅ CORRECT: Using RLS (Row-Level Security) in Supabase
CREATE POLICY "Users can only view their restaurant's orders"
ON orders FOR SELECT
USING (restaurant_id = get_restaurant_id());
```

---

## Key Patterns

### 1. Service Pattern (Stateless)
```typescript
// Services are static classes with no state
export class OrderService {
  static async create(restaurantId: string, data: CreateOrderDTO) {
    // Pure function: input → output
    // No this.property access
    // Can call other services/repositories
  }
}

// Usage
const order = await OrderService.create(restaurantId, data);
```

### 2. Repository Pattern (Single Responsibility)
```typescript
// Only database queries
export class OrderRepository {
  static async create(restaurantId: string, data: OrderData) {
    // Only: INSERT, SELECT, UPDATE, DELETE
  }
  
  static async findById(restaurantId: string, orderId: string) {
    // Always: WHERE restaurant_id = restaurantId
  }
}
```

### 3. Error Handling Pattern
```typescript
// Controllers catch errors and convert to HTTP responses
export async function createOrder(req: NextRequest, restaurantId: string) {
  try {
    const validated = createOrderSchema.parse(body);
    const order = await OrderService.create(restaurantId, validated);
    return NextResponse.json({ data: order });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_FAILED", details: error.details } },
        { status: 422 }
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 }
      );
    }
    // Log unexpected errors
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}
```

### 4. Middleware Pipeline Pattern
```typescript
// Compose middleware in route handlers
async function protectedRoute(req: NextRequest) {
  // 1. Auth middleware
  const user = await verifyToken(req);
  if (!user) return unauthorized();
  
  // 2. Tenant middleware
  const restaurantId = extractRestaurantId(req);
  if (!restaurantId) return badRequest();
  
  // 3. RBAC middleware
  if (!user.roles.includes("admin")) return forbidden();
  
  // 4. Validation middleware
  const validated = someSchema.parse(await req.json());
  
  // 5. Business logic
  const result = await someService.someMethod(restaurantId, validated);
  
  return NextResponse.json({ data: result });
}
```

### 5. Hook Pattern (Client State)
```typescript
// Hooks encapsulate frontend state logic
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const addItem = (dish: Dish, quantity: number) => {
    // Complex cart logic (duplicates, stock checks, etc.)
  };
  
  const removeItem = (dishId: string) => {
    // ...
  };
  
  const calculateTotal = () => {
    // GST, discounts, etc.
  };
  
  return { cart, addItem, removeItem, calculateTotal };
}

// Usage in components
function CartPage() {
  const { cart, calculateTotal } = useCart();
  return <div>Total: ₹{calculateTotal()}</div>;
}
```

---

## Database Schema

### Key Tables
- **restaurants** — Multi-tenant root entity
- **staff** — Team members with roles
- **restaurant_tables** — Physical tables with QR codes
- **sessions** — Guest dining sessions
- **categories** — Menu categories (Veg, Non-Veg, Beverages, etc.)
- **dishes** — Menu items with pricing, inventory
- **orders** — Customer orders linked to sessions
- **order_items** — Line items in orders
- **payments** — Payment records (card, cash, UPI)
- **invoices** — Generated bills
- **coupons** — Discount codes
- **loyalty_accounts** — Points balance per customer
- **reservations** — Advance bookings
- **waitlist** — Walk-in queue management
- **inventory** — Stock tracking
- **suppliers** — Vendor management
- **happy_hours** — Time-based discount rules
- **ratings** — Customer feedback
- **dish_ar_assets** — AR product images
- **combos** — Bundle meal offers

### Relationships
```
Restaurant (1) ──→ (Many) Staff
Restaurant (1) ──→ (Many) Tables
Restaurant (1) ──→ (Many) Sessions
Restaurant (1) ──→ (Many) Categories
Restaurant (1) ──→ (Many) Dishes
Restaurant (1) ──→ (Many) Orders
Restaurant (1) ──→ (Many) Coupons
Restaurant (1) ──→ (Many) Loyalty Accounts

Session (1) ──→ (Many) Orders
Session (1) ──→ (1) Table

Category (1) ──→ (Many) Dishes
Dish (1) ──→ (Many) Order Items
Order (1) ──→ (Many) Order Items
Order (1) ──→ (Many) Payments
Order (1) ──→ (1) Invoice

Coupon (Many-to-Many) ← Orders (via lookup)
Loyalty Account (1) ← Customer (implicit)
```

---

## API Versioning

All APIs are versioned under `/api/v1/`:
```
GET    /api/v1/menu?restaurantSlug=dominos
POST   /api/v1/orders
GET    /api/v1/orders/{orderId}
POST   /api/v1/payments
GET    /api/v1/restaurants/{slug}
```

**Future versions** will be additive:
```
/api/v2/orders — New response format
/api/v3/billing — New features
```

Clients can choose which version to call. Old versions stay functional.

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL         = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY        = eyJhbGc... (server-only)

# App
NEXT_PUBLIC_APP_URL              = http://localhost:3000 (or production URL)

# Optional: Third-party integrations
WHATSAPP_API_KEY                 = xxx
PUSH_NOTIFICATION_KEY            = xxx
```

---

## Deployment

### Vercel (Recommended)
```bash
1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy (auto on push to main)
```

### Docker (Self-hosted)
```bash
docker build -t menuara .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  menuara
```

### Railway / Render / AWS Amplify
Same pattern: set env vars, deploy Next.js app.

---

## Testing Strategy

### Unit Tests
- Test services in isolation
- Mock repositories
- Test business logic (GST calc, coupon validation, etc.)

### Integration Tests
- Test API routes with mocked Supabase
- Verify controllers call correct services
- Test error handling

### E2E Tests
- Customer ordering flow (QR → menu → cart → order)
- Admin order management
- Kitchen display updates
- Billing & payment

### Database Tests
- Verify migrations run cleanly
- Test RLS policies
- Test tenant isolation
- Test constraints & cascades

---

## Monitoring & Observability

### Logs
- Request/response logging in middleware
- Business event logging (orders, payments, etc.)
- Error logging (Sentry or similar)

### Metrics
- Order throughput
- Payment success rate
- API response times
- Database query performance

### Alerts
- Payment failures
- Database connection issues
- Rate limit violations
- High error rates

---

## Security Best Practices

### Authentication
- ✅ JWT tokens via Supabase Auth
- ✅ Refresh token rotation
- ✅ Secure httpOnly cookies (server mode)

### Authorization
- ✅ RBAC (admin, manager, waiter, kitchen, superadmin)
- ✅ Tenant isolation (restaurant_id checks everywhere)
- ✅ RLS policies in Supabase

### API Security
- ✅ Rate limiting on all endpoints
- ✅ Zod validation on all inputs
- ✅ CORS configured
- ✅ CSRF protection via middleware
- ✅ Never expose service role keys to client

### Data Security
- ✅ All queries filtered by restaurant_id
- ✅ Supabase encryption at rest
- ✅ SSL/TLS in transit
- ✅ Audit logs for sensitive operations

---

## Troubleshooting

### Issue: Orders not appearing in admin
1. Check `restaurant_id` matches
2. Verify auth token is valid
3. Check browser console for errors
4. Check server logs
5. Verify database connection

### Issue: Real-time updates not working
1. Check Supabase realtime is enabled
2. Verify subscription channel name
3. Check auth token has correct permissions
4. Look for WebSocket errors in console

### Issue: Payment failing
1. Verify payment gateway credentials
2. Check order total calculation
3. Verify coupon/discount logic
4. Check Supabase RLS policies

---

## Next Steps

1. Run `npm install && npm run build` to verify setup
2. Test all API endpoints with Postman or similar
3. Deploy to staging environment
4. Run e2e tests
5. Deploy to production
6. Setup monitoring & alerting

**Architecture is production-ready!** 🚀
