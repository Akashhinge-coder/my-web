# MENUARA — Enterprise Technical Architecture Documentation

> **Document Type:** Software Architecture & Engineering Reference  
> **Version:** 1.0.0 — Based on Sessions 3, 4, 5 (Final Build)  
> **Prepared by:** Senior Software Architect Review  
> **Stack:** Next.js 14 · TypeScript · Supabase · Tailwind CSS · PWA  
> **Target Audience:** Engineers, Technical Leads, DevOps, Onboarding Developers

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Current Project Structure (As-Built)](#3-current-project-structure-as-built)
4. [Recommended Scalable Folder Structure](#4-recommended-scalable-folder-structure)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Database Architecture](#7-database-architecture)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [API Architecture](#9-api-architecture)
10. [File & Media Management](#10-file--media-management)
11. [Real-Time Architecture](#11-real-time-architecture)
12. [PWA & Offline Strategy](#12-pwa--offline-strategy)
13. [Environment Configuration](#13-environment-configuration)
14. [Setup & Development Workflow](#14-setup--development-workflow)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Security Architecture](#16-security-architecture)
17. [Performance Optimization](#17-performance-optimization)
18. [Scalability Strategy](#18-scalability-strategy)
19. [Testing Strategy](#19-testing-strategy)
20. [CI/CD Pipeline](#20-cicd-pipeline)
21. [Monitoring & Logging](#21-monitoring--logging)
22. [Best Practices & Code Standards](#22-best-practices--code-standards)
23. [Future Improvements & Roadmap](#23-future-improvements--roadmap)

---

## 1. Project Overview

**Menuara** is a production-grade, multi-tenant SaaS platform built for Indian restaurants. It digitizes the complete dining lifecycle — from QR-based menu browsing to ordering, kitchen coordination, billing, and business analytics — all within a single unified platform.

### Core Value Proposition

| User Type | What Menuara Solves |
|---|---|
| **Restaurant Owner** | Replaces printed menus, manual billing, paper records with a live digital system |
| **Kitchen Staff** | Real-time order display removes dependency on verbal communication or printed tickets |
| **Waitstaff** | Table and session management from any device, no dedicated hardware needed |
| **Diner (Customer)** | Scan QR → browse menu with AR visualization → order → track → pay, fully self-serve |
| **Platform Operator** | Onboard unlimited restaurants, each isolated in a shared multi-tenant database |

### Business Model

Menuara operates as a B2B SaaS sold to restaurant owners. Each restaurant registers independently through a 3-step onboarding flow, receives a unique `slug` (e.g. `spice-garden`), and is fully operational within minutes. All restaurant data is hard-isolated at the database row level via Supabase Row Level Security (RLS).

### Feature Inventory

**Admin Panel (19 modules)**
- Live Dashboard — revenue, orders, active tables
- Order Management — real-time order feed with status transitions
- Table Management — floor plan, table status, QR code generation
- Reservations — advance booking management
- Waitlist — walk-in queue with WhatsApp notification
- Menu & Dishes — CRUD with image upload, multi-language (English + Hindi)
- AR Setup — 5-angle photo uploader for WebAR food visualization
- Combo Meals — bundled dish pricing
- Happy Hours — time-and-day-based automatic discounts
- Billing & Invoicing — GST-compliant invoice generation
- Coupons — flat and percentage discount codes
- Loyalty Program — points-based rewards tied to phone number
- Analytics — revenue charts, peak hours, payment breakdown
- Feedback — star rating aggregation by dish and service
- Integrations — WhatsApp end-of-day report
- Staff Management — role-based team accounts
- Inventory — ingredient stock tracking with low-stock alerts
- Supplier Management — vendor directory
- Restaurant Settings — profile, logo, GST number, currency

**Customer Application**
- QR-gated menu at `/:slug/:tableId`
- Dish filters: Veg / Non-Veg / Vegan / Jain / Spice level
- Full-text search across dishes
- Cart with GST auto-calculation
- Real-time order tracking
- WebAR dish viewer (3D preview from 5 camera angles)
- Bill view with payment options (UPI, GPay, PhonePe, Paytm, Cash, Card)

**Platform Systems**
- Kitchen Display System (KDS) — full-screen, role-specific view
- Super Admin Panel — platform-level oversight
- PWA — installable, offline-capable on all devices
- Service Worker — background sync for offline order queue

---

## 2. Technology Stack

### Core Framework & Runtime

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 14.2.16 | Full-stack React framework (App Router) |
| Language | TypeScript | ^5 | Type safety across entire codebase |
| Runtime | Node.js | ≥18 | Server-side execution environment |
| React | React | ^18 | UI component library |

### Backend & Data

| Layer | Technology | Purpose |
|---|---|---|
| Database | Supabase (PostgreSQL 15) | Primary data store — relational, multi-tenant |
| Auth | Supabase Auth | JWT-based authentication + session management |
| Real-Time | Supabase Realtime | WebSocket subscriptions for live order/table sync |
| Row Security | PostgreSQL RLS | Multi-tenant data isolation at the database layer |
| ORM / Query | Supabase JS SDK v2 | Type-safe database queries from server and client |
| Media Storage | Cloudinary | Image upload, transformation, CDN delivery |
| Payments | Razorpay | Payment gateway for UPI, cards, wallets (India) |

### Frontend

| Layer | Technology | Purpose |
|---|---|---|
| Styling | Tailwind CSS 3 | Utility-first CSS with custom design tokens |
| Icons | Lucide React | Consistent SVG icon library |
| Fonts | DM Sans, DM Mono, Playfair Display | Brand typography system |
| Class Utilities | clsx + tailwind-merge | Conditional class composition without conflicts |
| Animations | tailwindcss-animate | Declarative CSS transitions |
| AR Viewer | WebXR / Device orientation API | Augmented reality dish visualization |
| PWA | Web App Manifest + Service Worker | Installable offline-capable application |

### Infrastructure & DevOps

| Layer | Technology | Purpose |
|---|---|---|
| Hosting | Vercel | Edge-deployed Next.js with zero-config CI |
| Database Hosting | Supabase Cloud | Managed PostgreSQL with built-in auth and realtime |
| CDN (Images) | Cloudinary CDN | Auto-optimized image delivery globally |
| DNS / Domains | Custom domain via Vercel | `menuara.in` or client subdomain |
| Environment | `.env.local` + Vercel env vars | Secrets management per environment |

---


## 4. Recommended Scalable Folder Structure

The current structure is excellent for a solo developer but will create friction as the team, feature set, and test surface grow. The recommendation below separates concerns clearly, keeps the Next.js App Router for routing, and introduces a clean internal backend layer.

### Architectural Principle

Next.js is used as both the frontend framework **and** the API layer. The refactoring moves business logic out of pages and into dedicated service/repository layers that can be independently tested, mocked, and reused.

```
menuara/
│
├── src/                                  ← All source code lives here
│   │
│   ├── app/                              ← Next.js App Router (routing only)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (customer)/                   ← Customer-facing route group
│   │   │   └── [slug]/[tableId]/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── cart/page.tsx
│   │   │       ├── orders/page.tsx
│   │   │       ├── bill/page.tsx
│   │   │       └── ar/[dishId]/page.tsx
│   │   │
│   │   ├── (admin)/                      ← Admin route group
│   │   │   ├── layout.tsx
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── orders/page.tsx
│   │   │   │   ├── tables/page.tsx
│   │   │   │   ├── menu/page.tsx
│   │   │   │   ├── menu/ar/page.tsx
│   │   │   │   ├── reservations/page.tsx
│   │   │   │   ├── waitlist/page.tsx
│   │   │   │   ├── billing/page.tsx
│   │   │   │   ├── coupons/page.tsx
│   │   │   │   ├── combos/page.tsx
│   │   │   │   ├── happy-hours/page.tsx
│   │   │   │   ├── loyalty/page.tsx
│   │   │   │   ├── analytics/page.tsx
│   │   │   │   ├── feedback/page.tsx
│   │   │   │   ├── integrations/page.tsx
│   │   │   │   ├── staff/page.tsx
│   │   │   │   ├── inventory/page.tsx
│   │   │   │   ├── suppliers/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   │
│   │   │   └── kitchen/[restaurantId]/page.tsx
│   │   │
│   │   ├── (platform)/                   ← Superadmin route group
│   │   │   └── superadmin/page.tsx
│   │   │
│   │   ├── api/                          ← Next.js Route Handlers
│   │   │   ├── v1/                       ← Versioned API namespace
│   │   │   │   ├── orders/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── menu/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── payments/
│   │   │   │   │   └── route.ts
│   │   │   │   └── restaurants/
│   │   │   │       └── route.ts
│   │   │   ├── push/route.ts
│   │   │   ├── whatsapp/route.ts
│   │   │   └── webhook/route.ts
│   │   │
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   │
│   ├── backend/                          ← ★ BACKEND LAYER — pure business logic
│   │   │
│   │   ├── controllers/                  ← Request orchestration (thin layer)
│   │   │   ├── order.controller.ts       ← Handle order request/response cycle
│   │   │   ├── menu.controller.ts        ← Menu CRUD operations
│   │   │   ├── billing.controller.ts     ← Payment and invoice processing
│   │   │   ├── restaurant.controller.ts  ← Restaurant onboarding and settings
│   │   │   ├── analytics.controller.ts   ← Stats and reporting queries
│   │   │   └── auth.controller.ts        ← Registration and login handling
│   │   │
│   │   ├── services/                     ← Core business logic
│   │   │   ├── order.service.ts          ← Order lifecycle (create, confirm, cook, serve)
│   │   │   ├── menu.service.ts           ← Menu + dish + category management
│   │   │   ├── billing.service.ts        ← GST calculation, invoice generation
│   │   │   ├── coupon.service.ts         ← Coupon validation + usage tracking
│   │   │   ├── loyalty.service.ts        ← Points calculation and redemption
│   │   │   ├── happy-hours.service.ts    ← Time-based discount evaluation
│   │   │   ├── notification.service.ts   ← WhatsApp + push notification dispatch
│   │   │   ├── analytics.service.ts      ← Revenue aggregation, peak hour calculation
│   │   │   ├── inventory.service.ts      ← Stock decrement + low-stock alerting
│   │   │   ├── ar.service.ts             ← AR asset management and publishing
│   │   │   └── restaurant.service.ts     ← Onboarding, slug generation, settings
│   │   │
│   │   ├── repositories/                 ← Database access layer (data mappers)
│   │   │   ├── order.repository.ts       ← All SQL queries for orders
│   │   │   ├── menu.repository.ts        ← Category + dish queries
│   │   │   ├── table.repository.ts       ← Table + session queries
│   │   │   ├── payment.repository.ts     ← Payment + invoice queries
│   │   │   ├── restaurant.repository.ts  ← Restaurant + staff queries
│   │   │   ├── analytics.repository.ts   ← Aggregation and reporting queries
│   │   │   └── loyalty.repository.ts     ← Loyalty account queries
│   │   │
│   │   ├── middleware/                   ← Request pipeline middleware
│   │   │   ├── auth.middleware.ts        ← JWT verification + user context injection
│   │   │   ├── rbac.middleware.ts        ← Role-based access control checks
│   │   │   ├── rateLimit.middleware.ts   ← Per-IP and per-restaurant rate limiting
│   │   │   ├── validation.middleware.ts  ← Schema validation gate (Zod)
│   │   │   ├── tenant.middleware.ts      ← Restaurant ID injection + isolation check
│   │   │   └── logger.middleware.ts      ← Request/response logging
│   │   │
│   │   ├── validations/                  ← Zod schemas for all input
│   │   │   ├── order.schema.ts           ← Order creation, status update
│   │   │   ├── menu.schema.ts            ← Dish + category create/update
│   │   │   ├── payment.schema.ts         ← Payment confirmation payload
│   │   │   ├── restaurant.schema.ts      ← Registration + settings update
│   │   │   ├── coupon.schema.ts          ← Coupon creation + validation
│   │   │   └── staff.schema.ts           ← Staff invite + role assignment
│   │   │
│   │   ├── models/                       ← TypeScript domain models (business entities)
│   │   │   ├── Order.ts
│   │   │   ├── Dish.ts
│   │   │   ├── Restaurant.ts
│   │   │   ├── Session.ts
│   │   │   ├── Payment.ts
│   │   │   └── Invoice.ts
│   │   │
│   │   ├── errors/                       ← Typed error classes
│   │   │   ├── AppError.ts               ← Base error class
│   │   │   ├── AuthError.ts              ← 401 / 403 errors
│   │   │   ├── NotFoundError.ts          ← 404 errors
│   │   │   ├── ValidationError.ts        ← 422 input errors
│   │   │   └── handler.ts                ← Central error handler for route handlers
│   │   │
│   │   └── utils/                        ← Backend-specific utilities
│   │       ├── gst.ts                    ← GST calculation logic
│   │       ├── invoice.ts                ← Invoice number generation
│   │       ├── slug.ts                   ← Slug generation and uniqueness check
│   │       ├── qr.ts                     ← QR URL generation
│   │       └── phone.ts                  ← Indian phone normalization + validation
│   │
│   │
│   ├── frontend/                         ← ★ FRONTEND LAYER — UI only
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                       ← Primitive design system components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   └── index.ts              ← Barrel export
│   │   │   │
│   │   │   ├── admin/                    ← Admin-specific components
│   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   ├── AdminTopbar.tsx
│   │   │   │   ├── OrderCard.tsx
│   │   │   │   ├── TableGrid.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   └── StatCard.tsx
│   │   │   │
│   │   │   ├── customer/                 ← Customer app components
│   │   │   │   ├── DishCard.tsx
│   │   │   │   ├── CartDrawer.tsx
│   │   │   │   ├── CategoryNav.tsx
│   │   │   │   ├── FoodTypeFilter.tsx
│   │   │   │   └── ARViewer.tsx
│   │   │   │
│   │   │   ├── kitchen/                  ← KDS components
│   │   │   │   ├── OrderTicket.tsx
│   │   │   │   └── KDSHeader.tsx
│   │   │   │
│   │   │   └── shared/                   ← Cross-context shared components
│   │   │       ├── ServiceWorker.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── LoadingSkeleton.tsx
│   │   │       └── OfflineBanner.tsx
│   │   │
│   │   ├── hooks/                        ← Custom React hooks
│   │   │   ├── useCart.tsx               ← Cart state machine
│   │   │   ├── useRealtime.ts            ← Supabase realtime subscription hook
│   │   │   ├── useRestaurant.ts          ← Restaurant context access
│   │   │   ├── useAuth.ts                ← Auth state + user role
│   │   │   ├── useOfflineQueue.ts        ← Offline action queue management
│   │   │   └── useToast.ts               ← Toast notification trigger
│   │   │
│   │   └── providers/                    ← React context providers
│   │       ├── CartProvider.tsx          ← Cart context wrapper
│   │       ├── ToastProvider.tsx         ← Global toast queue
│   │       └── RealtimeProvider.tsx      ← Realtime subscription lifecycle
│   │
│   │
│   ├── config/                           ← App-wide configuration
│   │   ├── supabase.ts                   ← Supabase client factory (client + server + admin)
│   │   ├── constants.ts                  ← App-wide constants (GST rates, limits)
│   │   ├── routes.ts                     ← Typed route constants
│   │   └── features.ts                   ← Feature flags
│   │
│   ├── types/                            ← Global TypeScript definitions
│   │   ├── database.ts                   ← Auto-generated Supabase types (via CLI)
│   │   ├── domain.ts                     ← Business domain interfaces
│   │   ├── api.ts                        ← API request/response types
│   │   └── index.ts                      ← Barrel export
│   │
│   └── lib/                              ← Shared utilities (framework-agnostic)
│       ├── utils.ts                      ← Currency, date, formatting helpers
│       ├── cn.ts                         ← Tailwind class merger
│       └── validators.ts                 ← Phone, GST, email validators
│
│
├── supabase/                             ← Database source of truth
│   ├── schema.sql                        ← Complete DDL schema
│   ├── seed.sql                          ← Development seed data
│   ├── migrations/                       ← Ordered migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_combos.sql
│   │   ├── 003_add_happy_hours.sql
│   │   └── 004_add_loyalty.sql
│   └── functions/                        ← PostgreSQL functions
│       ├── get_restaurant_by_slug.sql
│       └── update_updated_at.sql
│
├── tests/                                ← Test suite
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/
│   │   └── database/
│   └── e2e/
│       ├── customer-flow.spec.ts
│       └── admin-flow.spec.ts
│
├── public/                               ← Static assets (unchanged)
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│
├── middleware.ts                         ← Edge middleware (root level, unchanged)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .env.local.example
├── .env.test.example
└── .gitignore
```

---

## 5. Frontend Architecture

### Architecture Pattern

Menuara uses **Next.js App Router** with a **Server Component first** approach. Data fetching happens in Server Components (zero client-side waterfall), and Client Components are used only for interactivity (cart, real-time subscriptions, form inputs).

```
Page Request
    │
    ▼
Next.js Edge Runtime (middleware.ts)
    │  → Auth check
    │  → Route-based redirects
    ▼
Server Component (page.tsx)
    │  → Direct Supabase query (no HTTP overhead)
    │  → Pre-rendered HTML sent to client
    ▼
Client Hydration
    │  → "use client" components mount
    │  → Realtime subscriptions attach
    │  → Cart/Provider state initializes
```

### Route Architecture

**Three distinct user apps share the same Next.js instance:**

| App | Route Pattern | Audience | Auth |
|---|---|---|---|
| Customer App | `/:slug/:tableId/*` | Restaurant guests | None (public) |
| Admin Panel | `/admin/*` | Owners + Staff | Required |
| Kitchen Display | `/kitchen/:restaurantId` | Kitchen staff | Required |
| Platform Admin | `/superadmin` | Menuara operators | Required |

Route groups `(auth)`, `(customer)`, `(admin)`, `(platform)` allow each app to have its own layout without affecting URL paths.

### Component Hierarchy

```
RootLayout (fonts, PWA, service worker)
├── (auth) AuthLayout
│   ├── LoginPage
│   └── RegisterPage (3-step wizard component)
│
├── (customer) CustomerLayout (CartProvider)
│   └── [slug]/[tableId]
│       ├── MenuPage (Server Component — initial load)
│       │   └── DishCard[] (Client Component — add to cart)
│       ├── CartPage (Client Component)
│       ├── OrdersPage (Client Component — realtime)
│       ├── BillPage (Client Component)
│       └── ARPage (Client Component — WebXR)
│
├── (admin) AdminLayout (auth gate, sidebar, topbar)
│   ├── DashboardPage (Server Component — parallel data fetch)
│   ├── OrdersPage (Client Component — realtime subscription)
│   ├── TablesPage (Client Component — realtime)
│   └── ... (all other admin pages)
│
└── KitchenPage (Client Component — realtime full-screen)
```

### State Management Strategy

| State Type | Solution | Why |
|---|---|---|
| Server state (menu, orders, sessions) | Supabase + Server Components | Co-located with data, zero client fetch |
| Real-time state (live orders, table status) | Supabase Realtime + `useEffect` | WebSocket subscription for instant updates |
| Cart state | `useReducer` + Context + `localStorage` | Complex multi-action state with persistence |
| Auth state | Supabase Auth via `@supabase/ssr` | SSR-safe session management via cookies |
| UI state (modals, toasts, filters) | `useState` local to component | Simple ephemeral state |
| Offline queue | `localStorage` + Service Worker | Survives page refresh, syncs on reconnect |

### Design System

Menuara uses a **custom design system** built on Tailwind CSS with semantic tokens defined in `globals.css` and `tailwind.config.ts`.

**Color Palette**

| Token | Value | Usage |
|---|---|---|
| `--brand` | `#C17D3C` | Primary CTA, active states, brand moments |
| `--brand-light` | `#E8A85F` | Hover states, gradients |
| `--dark` | `#0F0E0D` | Admin background |
| `--dark-surface` | `#1A1917` | Card backgrounds in admin |
| `--dark-border` | `#2A2825` | Borders and dividers |
| `--ink-1` to `--ink-4` | Gray scale | Text hierarchy |

**Typography**

| Font | Variable | Usage |
|---|---|---|
| Playfair Display | `--font-playfair` | Page headings, restaurant names |
| DM Sans | `--font-dm-sans` | Body text, UI labels |
| DM Mono | `--font-dm-mono` | Order numbers, codes, prices |

**Reusable CSS Component Classes** (defined in `globals.css`)

```css
.btn-primary     /* Brand amber button */
.btn-secondary   /* Ghost border button */
.btn-danger      /* Red destructive action */
.card-dark       /* Dark surface card */
.input-dark      /* Dark theme input field */
.badge-*         /* Status badges */
.section-label   /* Sidebar group labels */
```

---

## 6. Backend Architecture

### Pattern: Repository → Service → Controller

The recommended backend architecture follows a strict **3-layer separation**:

```
API Route Handler (route.ts)
    │
    ▼
Controller Layer               ← Orchestrates request/response
    │  • Extract params
    │  • Call service
    │  • Return JSON response
    ▼
Service Layer                  ← Business logic
    │  • Validate business rules
    │  • Compose multiple repository calls
    │  • Apply domain logic (GST, loyalty points, coupon validation)
    ▼
Repository Layer               ← Database access
    │  • Execute SQL queries via Supabase SDK
    │  • Map DB rows to domain types
    │  • Never contains business logic
    ▼
Supabase (PostgreSQL)
```

### Controller Example Pattern

```typescript
// src/backend/controllers/order.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/backend/services/order.service';
import { createOrderSchema } from '@/backend/validations/order.schema';
import { handleError } from '@/backend/errors/handler';
import { authMiddleware } from '@/backend/middleware/auth.middleware';

export async function createOrder(req: NextRequest) {
  try {
    const user = await authMiddleware(req);
    const body = await req.json();
    const validated = createOrderSchema.parse(body);
    const order = await OrderService.create(validated, user.restaurantId);
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
```

### Service Example Pattern

```typescript
// src/backend/services/order.service.ts
import { OrderRepository } from '@/backend/repositories/order.repository';
import { InventoryService } from './inventory.service';
import { NotificationService } from './notification.service';
import type { CreateOrderDTO } from '@/types/api';

export class OrderService {
  static async create(dto: CreateOrderDTO, restaurantId: string) {
    // 1. Validate session is active
    const session = await OrderRepository.getActiveSession(dto.sessionId);
    if (!session) throw new NotFoundError('Session not found or closed');

    // 2. Create order with items
    const order = await OrderRepository.create({ ...dto, restaurantId });

    // 3. Decrement inventory
    await InventoryService.decrementForOrder(order.items);

    // 4. Notify kitchen via realtime (Supabase handles broadcast)
    await NotificationService.notifyKitchen(restaurantId, order);

    return order;
  }
}
```

### Repository Example Pattern

```typescript
// src/backend/repositories/order.repository.ts
import { createAdminClient } from '@/config/supabase';
import type { Order, CreateOrderDTO } from '@/types/domain';

export class OrderRepository {
  static async create(dto: CreateOrderDTO & { restaurantId: string }): Promise<Order> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('orders')
      .insert({
        session_id: dto.sessionId,
        restaurant_id: dto.restaurantId,
        order_number: generateOrderNumber(),
        total: dto.total,
        notes: dto.notes,
      })
      .select(`*, order_items(*, dishes(*))`)
      .single();

    if (error) throw new DatabaseError(error.message);
    return data;
  }
}
```

### Error Handling Architecture

All errors flow through a single `handleError()` function that maps domain errors to HTTP responses:

```typescript
// src/backend/errors/handler.ts
export function handleError(error: unknown): NextResponse {
  if (error instanceof ValidationError)
    return NextResponse.json({ error: error.message, fields: error.fields }, { status: 422 });
  if (error instanceof AuthError)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (error instanceof NotFoundError)
    return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof AppError)
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  
  console.error('[Unhandled Error]', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

### Validation with Zod

All incoming API data is validated with Zod before reaching business logic:

```typescript
// src/backend/validations/order.schema.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(z.object({
    dishId: z.string().uuid(),
    quantity: z.number().int().min(1).max(50),
    notes: z.string().max(200).optional(),
  })).min(1).max(30),
  notes: z.string().max(500).optional(),
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
```

---

## 7. Database Architecture

### Overview

Menuara uses **Supabase (PostgreSQL 15)** as its sole data store. The database handles multi-tenancy, real-time messaging, and authorization natively — eliminating the need for separate caching, message queue, or auth services at the current scale.

### Entity Relationship Summary

```
auth.users (Supabase managed)
    │
    ├──owns──► restaurants (1:many per owner)
    │               │
    │           ├── restaurant_tables ──► sessions ──► orders ──► order_items
    │           ├── staff                                          │
    │           ├── categories ──► dishes ──► dish_ar_assets      └── dishes
    │           ├── combos                  payments ──► invoices
    │           ├── coupons                 ratings
    │           ├── loyalty_accounts        reservations
    │           ├── waitlist                happy_hours
    │           ├── inventory ──► suppliers
    │           └── (all other tables)
```

### Table Inventory (21 tables)

| Table | Row Count Estimate | Key Relationships |
|---|---|---|
| `restaurants` | ~1K (one per client) | Root tenant entity |
| `staff` | ~10K | `restaurants`, `auth.users` |
| `restaurant_tables` | ~50K | `restaurants`, `sessions` |
| `sessions` | ~10M/year | `restaurant_tables`, `restaurants` |
| `categories` | ~100K | `restaurants` |
| `dishes` | ~500K | `categories`, `restaurants` |
| `dish_ar_assets` | ~50K | `dishes` |
| `combos` | ~50K | `restaurants` |
| `orders` | ~50M/year | `sessions`, `restaurants` |
| `order_items` | ~150M/year | `orders`, `dishes` |
| `payments` | ~10M/year | `sessions`, `restaurants` |
| `invoices` | ~10M/year | `payments` |
| `coupons` | ~100K | `restaurants` |
| `loyalty_accounts` | ~5M | `restaurants` |
| `reservations` | ~5M/year | `restaurants`, `restaurant_tables` |
| `waitlist` | ~5M/year | `restaurants` |
| `inventory` | ~1M | `restaurants`, `suppliers` |
| `suppliers` | ~50K | `restaurants` |
| `happy_hours` | ~50K | `restaurants` |
| `ratings` | ~10M/year | `restaurants`, `sessions`, `dishes` |

### Key PostgreSQL Features Used

**Custom Enum Types** — enforce valid values at the DB level, not application level:
```sql
CREATE TYPE order_status AS ENUM ('pending', 'cooking', 'served', 'cancelled');
CREATE TYPE payment_method AS ENUM ('upi', 'gpay', 'phonepe', 'paytm', 'cash', 'card');
CREATE TYPE staff_role AS ENUM ('admin', 'manager', 'waiter', 'kitchen', 'superadmin');
```

**Automatic `updated_at` via trigger** — ensures timestamps are never stale:
```sql
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Security Definer Function** — public menu access without exposing internal tables:
```sql
CREATE FUNCTION get_restaurant_by_slug(p_slug TEXT)
RETURNS TABLE(...) AS $$ ... $$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Index Strategy

```sql
-- Hot path: order listing for a restaurant
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_created    ON orders(created_at DESC);

-- Hot path: customer session lookup
CREATE INDEX idx_sessions_restaurant ON sessions(restaurant_id);
CREATE INDEX idx_sessions_status     ON sessions(status);

-- Hot path: menu load for customer
CREATE INDEX idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX idx_dishes_category   ON dishes(category_id);

-- Hot path: loyalty lookup by phone
CREATE INDEX idx_loyalty_phone ON loyalty_accounts(restaurant_id, phone);
```

### Multi-Tenancy via Row Level Security (RLS)

Every table has RLS enabled. Restaurant data is isolated at the row level — no application-level filtering is required (and cannot be bypassed).

```sql
-- Restaurant owners see only their own restaurant
CREATE POLICY "owner_access_restaurant" ON restaurants FOR ALL
  USING (owner_id = auth.uid());

-- Staff see the restaurant they're assigned to
CREATE POLICY "staff_read_restaurant" ON restaurants FOR SELECT
  USING (id IN (SELECT restaurant_id FROM staff WHERE user_id = auth.uid()));

-- Customer menu browsing requires no auth (public policy)
CREATE POLICY "public_read_dishes" ON dishes FOR SELECT
  USING (is_available = TRUE);
```

---

## 8. Authentication & Authorization

### Authentication Flow

```
User submits login form
    │
    ▼
Supabase Auth (email + password)
    │  → Issues JWT access token + refresh token
    │  → Stored in httpOnly cookies via @supabase/ssr
    ▼
middleware.ts runs on every request
    │  → createServerClient reads cookies
    │  → supabase.auth.getUser() validates JWT
    │  → Redirects to /login if invalid
    ▼
Server Component / Route Handler
    │  → createClient() provides user context
    │  → RLS policies auto-scope all queries
```

### Role-Based Access Control (RBAC)

**Current implementation:** Role is stored in the `staff.role` column and checked in the Admin Layout Server Component. Navigation items are conditionally rendered based on role.

**Recommended enhancement:** Add a `rbac.middleware.ts` that enforces role checks at the route handler level:

```typescript
// Roles in order of access level
const ROLE_HIERARCHY = {
  superadmin: 5,
  admin: 4,
  manager: 3,
  waiter: 2,
  kitchen: 1,
} as const;

export function requireRole(minRole: UserRole) {
  return async (req: NextRequest) => {
    const user = await getAuthUser(req);
    if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minRole]) {
      throw new AuthError('Insufficient permissions');
    }
    return user;
  };
}
```

**Role Permission Matrix**

| Permission | superadmin | admin | manager | waiter | kitchen |
|---|---|---|---|---|---|
| View dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage orders | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage tables | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage menu | ✅ | ✅ | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage billing | ✅ | ✅ | ✅ | ❌ | ❌ |
| Platform admin | ✅ | ❌ | ❌ | ❌ | ❌ |

### Session Architecture

- Sessions are managed entirely by `@supabase/ssr` via secure httpOnly cookies
- The `middleware.ts` at the edge refreshes tokens automatically on every request
- Admin routes require an authenticated user AND a matching restaurant record
- Customer routes (`/[slug]/[tableId]/*`) are **fully public** — no auth needed

---

## 9. API Architecture

### API Route Handler Structure

Next.js Route Handlers in `app/api/` follow REST conventions:

```
GET  /api/v1/orders?restaurantId=xxx    ← List orders
POST /api/v1/orders                      ← Create order
GET  /api/v1/orders/:id                  ← Get single order
PUT  /api/v1/orders/:id/status           ← Update order status
```

### Existing API Routes

| Route | Purpose | Auth |
|---|---|---|
| `/api/push` | Web Push notification subscription management | Required |
| `/api/whatsapp` | WhatsApp message dispatch (EOD reports, bill links) | Required |
| `/api/webhook` | Inbound webhooks (Razorpay payment confirmation) | HMAC Signature |

### Recommended API Response Format

All API responses should follow a consistent envelope:

```typescript
// Success response
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-05-17T10:00:00Z",
    "requestId": "req_abc123"
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "fields": { "phone": "Must be 10 digits" }
  }
}

// Paginated list response
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 147,
    "hasMore": true
  }
}
```

### Server Actions (Current Pattern)

Currently, admin pages use **Next.js Server Components with inline Supabase calls** rather than API routes. This is appropriate for read-heavy dashboard data but write operations (creating orders, updating dish availability) should move to either:

1. **Route Handlers** (`/api/v1/...`) — for external access or mobile app compatibility
2. **Server Actions** (`"use server"` functions) — for form submissions within the same Next.js app

```typescript
// Recommended: Server Action pattern for form mutations
// src/app/admin/menu/actions.ts
'use server';

import { createClient } from '@/config/supabase';
import { revalidatePath } from 'next/cache';

export async function toggleDishAvailability(dishId: string, isAvailable: boolean) {
  const supabase = await createClient();
  await supabase.from('dishes').update({ is_available: isAvailable }).eq('id', dishId);
  revalidatePath('/admin/menu');
}
```

---

## 10. File & Media Management

### Image Upload Pipeline

```
Admin uploads dish photo
    │
    ▼
Client: FormData → /api/media/upload
    │
    ▼
Server: Cloudinary SDK upload
    │  → Auto-resize to 800×600
    │  → Convert to WebP
    │  → Generate responsive sizes (thumbnail, card, full)
    │  → Return public_id + CDN URL
    │
    ▼
Database: Store URL in dishes.image_url
    │
    ▼
Next.js Image component renders from Cloudinary CDN
```

### Cloudinary Configuration

```typescript
// src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadDishImage = async (file: Buffer, restaurantId: string) => {
  return cloudinary.uploader.upload_stream({
    folder: `menuara/${restaurantId}/dishes`,
    transformation: [
      { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
      { format: 'webp', quality: 'auto:good' },
    ],
  });
};
```

### AR Asset Storage

The AR viewer uses 5 pre-captured angles (`front`, `back`, `left`, `right`, `top`) stored as Cloudinary image URLs in the `dish_ar_assets` table. The WebAR viewer loads these images and composites them onto a flat surface tracked via the device camera using the DeviceOrientation API.

---

## 11. Real-Time Architecture

### Supabase Realtime Subscriptions

Tables configured for real-time broadcast:
- `orders` — new orders, status changes
- `order_items` — item-level status updates
- `restaurant_tables` — table status changes
- `sessions` — session open/close events
- `dishes` — menu availability changes (86'ing a dish)

### Realtime Hook Pattern

```typescript
// src/frontend/hooks/useRealtime.ts
import { useEffect } from 'react';
import { createClient } from '@/config/supabase';

export function useRealtimeOrders(restaurantId: string, onUpdate: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => onUpdate())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);
}
```

### Real-Time Data Flow

```
Kitchen staff marks order "cooking"
    │
    ▼
Supabase DB UPDATE on orders table
    │
    ▼
Supabase Realtime broadcasts to subscribed channels
    │
    ├──► Admin Orders page refreshes status badge
    ├──► Customer Orders page shows "🍳 Being prepared"
    └──► Kitchen Display stays in sync
```

---

## 12. PWA & Offline Strategy

### Service Worker Responsibilities

The service worker (`public/sw.js`) implements:

1. **Cache-First for static assets** — HTML, CSS, JS, fonts served from cache instantly
2. **Network-First for API calls** — fresh data preferred, cache fallback if offline
3. **Background Sync** — queued orders are replayed when connectivity returns

### Offline Queue Pattern

```typescript
// When placing order offline:
queueOfflineAction({ type: 'CREATE_ORDER', payload: { items, sessionId } });

// Service worker background sync event:
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(replayOfflineQueue());
  }
});
```

### PWA Install Experience

The `manifest.json` configures:
- Standalone display mode (no browser chrome)
- Portrait orientation lock
- App shortcuts to Dashboard and Live Orders
- Amber theme color (#C17D3C)
- Full icon set (72px to 512px) for all device contexts

---

## 13. Environment Configuration

### Environment Variables Reference

```bash
# ── Supabase ─────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
# Public anon key — safe to expose in browser (RLS enforces security)
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
# Service role key — NEVER expose in browser, server-only
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# ── Application ──────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Used for QR URL generation: {APP_URL}/{slug}/{tableId}

# ── Cloudinary (Image Upload & CDN) ─────────────────────────
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET   # Server-only

# ── Razorpay (Payment Gateway) ───────────────────────────────
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET  # Server-only

# ── Optional (Future) ─────────────────────────────────────────
WHATSAPP_API_TOKEN=          # WhatsApp Business API token
PUSH_VAPID_PUBLIC_KEY=       # Web Push public key
PUSH_VAPID_PRIVATE_KEY=      # Web Push private key (server-only)
SENTRY_DSN=                  # Error tracking
```

### Environment Separation

| Variable Prefix | Accessible | Storage |
|---|---|---|
| `NEXT_PUBLIC_` | Browser + Server | Vercel env vars, `.env.local` |
| No prefix | Server only | Vercel env vars (encrypted), never commit |

### Recommended: `.env` Schema Validation

Add startup validation to catch missing environment variables early:

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

export const env = envSchema.parse(process.env);
// Throws at startup if any required variable is missing or malformed
```

---

## 14. Setup & Development Workflow

### Prerequisites

- Node.js ≥ 18.17.0
- npm ≥ 9 (or pnpm ≥ 8)
- Git
- Supabase account
- Cloudinary account (free tier sufficient)

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_ORG/menuara.git
cd menuara

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in all values in .env.local

# 4. Set up the database
# Go to Supabase → SQL Editor → paste supabase/schema.sql → Run

# 5. Start the development server
npm run dev
# Open http://localhost:3000

# 6. Test the onboarding flow
# Visit /register → create a test restaurant
# Sign in at /login → verify admin panel at /admin
```

### Development Commands

```bash
npm run dev        # Start dev server with hot reload (port 3000)
npm run build      # Production build (verifies types + lint)
npm run start      # Start production server locally
npm run lint       # ESLint check
npm run type-check # TypeScript strict check without emitting files
npm run test       # Run Jest unit tests (once added)
npm run test:e2e   # Run Playwright E2E tests (once added)
```

### Branch Strategy

```
main              ← Production. Deploys automatically to Vercel.
develop           ← Integration branch. PR target for feature branches.
feature/*         ← Feature branches. e.g. feature/combo-meals
fix/*             ← Bug fix branches. e.g. fix/gst-calculation
release/*         ← Release branches for final testing before main merge.
```

### Local Database Management

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local Supabase
supabase init
supabase start   # Starts local Postgres + Auth + Realtime on Docker

# Run migrations
supabase db push

# Generate TypeScript types from schema
supabase gen types typescript --local > src/types/database.ts
```

---

## 15. Deployment Architecture

### Production Deployment (Vercel + Supabase)

```
GitHub Push to main
    │
    ▼
Vercel Build Pipeline
    │  → npm install
    │  → npm run build (TypeScript compile + Next.js build)
    │  → Static export of landing page
    │  → Edge runtime bundling for middleware.ts
    ▼
Vercel Global Edge Network
    │  → Static assets served from CDN edge (~300 POPs)
    │  → Server Components run in regional compute
    │  → API Routes run as serverless functions
    ▼
Supabase (Singapore region for India latency)
    │  → PostgreSQL reads/writes
    │  → Realtime WebSocket connections
    │  → Auth token validation
    ▼
Cloudinary CDN
    │  → Image delivery (auto-format, auto-quality)
    │  → AR asset delivery
```

### Vercel Configuration

```json
// vercel.json (recommended additions)
{
  "regions": ["sin1"],
  "functions": {
    "app/api/**": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

### Deployment Environments

| Environment | Branch | URL | Purpose |
|---|---|---|---|
| Production | `main` | `menuara.in` | Live client restaurants |
| Staging | `develop` | `staging.menuara.in` | Pre-release testing |
| Preview | Any PR | `*.vercel.app` | Per-PR automatic preview |
| Local | Any | `localhost:3000` | Developer machines |

---

## 16. Security Architecture

### Defense-in-Depth Model

```
Layer 1: Edge (Vercel)        → DDoS protection, TLS termination, bot filtering
Layer 2: Middleware            → Auth token validation, route protection
Layer 3: API Route Handlers    → Input validation (Zod), RBAC enforcement
Layer 4: Service Layer         → Business rule validation
Layer 5: Database (RLS)        → Row-level data isolation, auth.uid() enforcement
```

### Critical Security Controls

**1. Row Level Security (RLS)**
Every database table enforces isolation via `auth.uid()`. Even if application-level checks fail, the database will not return another restaurant's data.

**2. Service Role Key Protection**
`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is used only in server-side code for admin operations (initial restaurant setup, super admin queries) and must never appear in client-side code.

**3. Input Validation**
All data entering the backend should pass through Zod schemas. This prevents malformed data, injection attacks, and unexpected field pollution.

**4. HMAC Webhook Verification**
Incoming webhooks from Razorpay must be verified using HMAC-SHA256 signature validation before processing payment confirmations.

```typescript
// src/app/api/webhook/route.ts
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-razorpay-signature');
  const body = await req.text();
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');
  if (signature !== expected) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  // Process payment...
}
```

**5. Rate Limiting**
Protect against brute-force and abuse on:
- `/login` — max 10 attempts per IP per minute
- `/register` — max 3 attempts per IP per hour
- `/api/*` — max 100 requests per restaurant per minute

**6. Security Headers**
Set via `vercel.json` or `next.config.js`:
- `X-Frame-Options: DENY` — prevent clickjacking
- `X-Content-Type-Options: nosniff` — prevent MIME sniffing
- `Content-Security-Policy` — restrict script sources
- `Strict-Transport-Security` — enforce HTTPS

**7. Image Domain Allowlist**
`next.config.js` explicitly allows only Cloudinary, Unsplash, and Supabase Storage as remote image sources, preventing image proxy abuse.

### Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only used in server-side code
- [ ] All API mutations validate auth token
- [ ] All API mutations verify `restaurant_id` ownership
- [ ] Razorpay webhooks verify HMAC signature
- [ ] Zod validation on all POST/PUT/PATCH request bodies
- [ ] Security headers set on all responses
- [ ] Rate limiting on auth endpoints
- [ ] No secrets in client bundle (`NEXT_PUBLIC_` prefix audit)
- [ ] Cloudinary uploads use signed upload (not unsigned)

---

## 17. Performance Optimization

### Current Performance Features

| Feature | Implementation | Impact |
|---|---|---|
| Server Components | Default in App Router | Zero client-side data waterfall for initial load |
| Parallel data fetching | `Promise.all()` in dashboard | 5 concurrent DB queries instead of sequential |
| Image optimization | Next.js `<Image>` + Cloudinary | Auto WebP, lazy load, responsive sizes |
| Service Worker | Cache-first for static assets | Sub-100ms repeat loads |
| Font optimization | `next/font/google` with `display: swap` | No FOUT, self-hosted |
| CSS optimization | Tailwind purge in production | Minimal CSS bundle |

### Recommended Performance Enhancements

**1. Database Connection Pooling**
Use Supabase's built-in connection pooler (PgBouncer) by appending `?pgbouncer=true` to the connection string for API routes that make many concurrent DB calls.

**2. Query Result Caching**
For read-heavy public data (menu, categories), implement `unstable_cache` from Next.js:

```typescript
import { unstable_cache } from 'next/cache';

export const getMenuBySlug = unstable_cache(
  async (slug: string) => {
    // Supabase query here
  },
  ['menu'],
  { revalidate: 300, tags: ['menu'] } // 5-minute TTL
);
```

**3. Selective Realtime**
Only subscribe to realtime channels when the user is actively viewing. Unsubscribe when the component unmounts to reduce server connection load.

**4. Pagination**
Order lists should use cursor-based pagination (`created_at` + `id`) rather than `OFFSET` for consistent performance at scale:

```typescript
// Cursor pagination (better than OFFSET)
.from('orders')
.select('*')
.lt('created_at', cursor)
.order('created_at', { ascending: false })
.limit(20)
```

**5. Image Preloading for AR**
Pre-fetch AR angle images when a user opens a dish detail modal rather than waiting for them to tap the AR button.

**6. Analytics Query Optimization**
Move heavy aggregation queries (analytics page) to PostgreSQL stored procedures or materialized views to avoid full table scans on `orders` and `payments`.

---

## 18. Scalability Strategy

### Current Scale (Single Next.js App + Supabase)

This architecture supports **~500 restaurants** with smooth performance under the free/pro Supabase and Vercel tiers.

### Tier 2: 500–5,000 Restaurants

- Upgrade Supabase to Pro tier (dedicated compute + 8GB RAM)
- Enable Supabase Read Replicas for analytics queries
- Implement Redis (Upstash) for session caching and rate limiting
- Move heavy analytics to a nightly materialized view job
- Add CDN-level caching for public menu pages (`/:slug/:tableId`)

### Tier 3: 5,000+ Restaurants (Regional SaaS)

```
Load Balancer (Vercel Edge)
    │
    ├── Next.js App Cluster (auto-scaled by Vercel)
    │
    ├── Supabase Primary (writes + auth)
    │
    ├── Read Replicas × 3 (analytics, menu reads, reporting)
    │
    ├── Redis Cluster (Upstash) — rate limiting, hot cache
    │
    └── Background Jobs (Trigger.dev or Inngest)
        ├── EOD report generation (WhatsApp)
        ├── Invoice PDF generation
        ├── Low stock alert emails
        └── Analytics aggregation
```

### Database Partitioning Strategy (future)

For `orders` and `order_items` tables which grow fastest, implement **range partitioning by month**:

```sql
-- Future: partition orders by month for archival performance
CREATE TABLE orders_2026_05 PARTITION OF orders
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

### Multi-Region Deployment (future)

Deploy Supabase in multiple regions (Singapore for India, Frankfurt for EU) with edge routing based on `restaurant.region` to minimize latency for global clients.

---

## 19. Testing Strategy

### Testing Pyramid

```
         ┌──────────────┐
         │   E2E Tests  │  5%   Playwright — full customer + admin flows
         ├──────────────┤
         │ Integration  │  25%  API + DB queries against test Supabase
         ├──────────────┤
         │  Unit Tests  │  70%  Services, utilities, validators
         └──────────────┘
```

### Unit Tests (Jest + ts-jest)

Focus on pure business logic:

```typescript
// tests/unit/services/billing.service.test.ts
describe('BillingService.calculateGST', () => {
  it('calculates 5% GST correctly (2.5 CGST + 2.5 SGST)', () => {
    const result = calculateGST(1000, 2.5, 2.5);
    expect(result.cgst).toBe(25);
    expect(result.sgst).toBe(25);
    expect(result.total).toBe(1050);
  });
});
```

### Integration Tests

Test Route Handlers against a real test database:

```typescript
// tests/integration/api/orders.test.ts
it('POST /api/v1/orders creates order and returns 201', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TEST_JWT}` },
    body: JSON.stringify({ sessionId: TEST_SESSION, items: [...] }),
  });
  expect(res.status).toBe(201);
  const data = await res.json();
  expect(data.data.order_number).toMatch(/^#[A-Z0-9]{4}$/);
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/customer-flow.spec.ts
test('customer can browse menu, add to cart, and place order', async ({ page }) => {
  await page.goto(`/${TEST_SLUG}/${TEST_TABLE_ID}`);
  await expect(page.locator('h1')).toContainText(TEST_RESTAURANT_NAME);
  await page.click('[data-testid="dish-card"]:first-child .add-btn');
  await page.click('[data-testid="cart-icon"]');
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
  await page.click('[data-testid="place-order-btn"]');
  await expect(page.locator('[data-testid="order-status"]')).toContainText('Pending');
});
```

---

## 20. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test --coverage

  e2e:
    needs: quality
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_JWT: ${{ secrets.TEST_JWT }}

  deploy:
    needs: [quality, e2e]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Deployment Gates

| Gate | Condition | Action |
|---|---|---|
| Lint | ESLint errors | Block PR merge |
| Type check | TypeScript errors | Block PR merge |
| Unit tests | Any test failure | Block PR merge |
| Coverage | < 60% coverage | Warning (not blocking initially) |
| E2E tests | Critical path failure | Block `main` deployment |
| Build | Next.js build failure | Block deployment |

---

## 21. Monitoring & Logging

### Recommended Observability Stack

| Tool | Purpose | Free Tier |
|---|---|---|
| Vercel Analytics | Web Vitals, page performance | Yes |
| Sentry | Error tracking, stack traces | 5K errors/month |
| Supabase Dashboard | Database performance, slow queries | Yes |
| Upstash Redis | Rate limit and cache metrics | Yes |
| Better Stack (Logtail) | Structured log aggregation | 1GB/month |

### Structured Logging Pattern

```typescript
// src/backend/utils/logger.ts
export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: 'info', msg, ...meta, ts: new Date().toISOString() })),

  error: (msg: string, error?: unknown, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({
      level: 'error', msg, error: String(error), ...meta, ts: new Date().toISOString()
    })),
};

// Usage in service layer:
logger.info('Order created', { orderId: order.id, restaurantId, itemCount: items.length });
logger.error('Payment verification failed', error, { webhookId, razorpayId });
```

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|---|---|---|
| Menu page load (LCP) | < 2.5s | > 4s |
| Order placement latency | < 500ms | > 2s |
| Realtime sync delay | < 200ms | > 1s |
| API error rate | < 0.1% | > 1% |
| DB query time (p95) | < 100ms | > 500ms |
| Uptime | 99.9% | < 99.5% |

---

## 22. Best Practices & Code Standards

### TypeScript Conventions

```typescript
// ✅ Always define prop interfaces above the component
interface OrderCardProps {
  order: Order;
  onStatusChange: (id: string, status: OrderStatus) => void;
}

// ✅ Use discriminated unions for state
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

// ✅ Avoid any — use unknown and narrow
function processWebhook(payload: unknown) {
  if (!isRazorpayPayload(payload)) throw new ValidationError('Invalid payload');
  // payload is now typed
}

// ❌ Avoid inline type casting without validation
const data = response as OrderData; // dangerous
```

### Component Conventions

```typescript
// ✅ Server Component default — no "use client" unless needed
// app/admin/orders/page.tsx — fetches data server-side
export default async function OrdersPage() {
  const orders = await OrderRepository.list(restaurantId);
  return <OrdersClient initialOrders={orders} restaurantId={restaurantId} />;
}

// ✅ Separate Client Component for interactivity
// components/admin/OrdersClient.tsx
'use client';
export function OrdersClient({ initialOrders, restaurantId }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  useRealtimeOrders(restaurantId, () => refetch());
  // ...
}
```

### Database Query Conventions

```typescript
// ✅ Always select only needed columns
.select('id, order_number, status, total, created_at')

// ✅ Always filter by restaurant_id (belt-and-suspenders with RLS)
.eq('restaurant_id', restaurantId)

// ✅ Use `.single()` only when exactly one row is expected
// Use `.maybeSingle()` when zero results is valid

// ✅ Always handle errors
const { data, error } = await supabase.from('orders').select('*');
if (error) throw new DatabaseError(error.message);
```

### Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `OrderCard.tsx` |
| Files (utilities) | camelCase | `formatCurrency.ts` |
| Files (pages) | `page.tsx` | Next.js convention |
| Variables / functions | camelCase | `calculateGST()` |
| Types / Interfaces | PascalCase | `OrderStatus` |
| Database tables | snake_case | `order_items` |
| CSS custom properties | kebab-case | `--brand-color` |
| Supabase columns | snake_case | `restaurant_id` |
| React props | camelCase | `restaurantId` |

---

## 23. Future Improvements & Roadmap

### Phase 1 — Code Quality (Immediate)

| Task | Effort | Priority |
|---|---|---|
| Extract business logic from pages into service layer | 2 weeks | High |
| Add Zod validation to all API mutations | 1 week | High |
| Add TypeScript strict mode + fix violations | 1 week | High |
| Extract reusable UI components (Button, Input, Card, Modal) | 1 week | Medium |
| Add environment variable schema validation | 1 day | High |
| Move `types/index.ts` to separate domain/api files | 0.5 day | Medium |
| Add `useRealtime` hook to deduplicate subscription logic | 1 day | Medium |

### Phase 2 — Product Features (Next 3 Months)

| Feature | Description |
|---|---|
| **Mobile App** | React Native (Expo) sharing the same Supabase backend |
| **Multi-language Menu** | Hindi content currently in schema, needs UI rendering |
| **Zomato/Swiggy Integration** | `order_source` enum already supports this; needs webhook handler |
| **Invoice PDF Generation** | Use `@react-pdf/renderer` or Puppeteer for printable GST invoices |
| **Table QR Generation** | Dynamic QR code generation in-app (currently manual URL) |
| **Staff Mobile App** | Waiter order-taking app — simpler UI, same backend |
| **Customer Feedback** | Rating flow after bill payment for each dish and service |
| **Push Notifications** | Web Push to admin when new order placed (VAPID keys in env) |

### Phase 3 — Platform Expansion (6–12 Months)

| Feature | Description |
|---|---|
| **Multi-Branch Support** | One owner account managing multiple restaurant locations |
| **Marketplace Listings** | Customers discover restaurants via menuara.in public directory |
| **Advanced Analytics** | Cohort analysis, menu item cannibalization, repeat customer tracking |
| **Online Pre-Ordering** | Customer reserves table + pre-orders food via public link |
| **Central Kitchen Module** | Aggregated orders for dark kitchens or cloud kitchen operators |
| **Subscription Billing** | Automated monthly billing for restaurant SaaS subscriptions (Razorpay Subscriptions) |
| **Partner Integrations** | Swiggy Dineout, EazyDiner, Google Reserve integration for reservations |
| **Accounting Export** | Tally / Zoho Books / QuickBooks export for GST returns |

### Technical Debt to Address

| Item | Risk | Remediation |
|---|---|---|
| `types/` not auto-generated from Supabase | Schema drift, runtime errors | `supabase gen types typescript` in CI |
| No test coverage | Regressions in production | Add Jest + Playwright as per Section 19 |
| Business logic in page components | Untestable, hard to refactor | Repository/Service layer as per Section 6 |
| `createAdminClient` uses `require()` | Not idiomatic ESM | Convert to proper import |
| Order numbers use `Math.random()` | Potential collisions at scale | Use database sequence or UUID prefix |
| No rate limiting on auth routes | Brute-force vulnerability | Add middleware rate limiting |
| Invoice numbers use `Math.random()` | Not sequentially auditable | Use DB sequence for GST compliance |
| `localStorage` for cart | Only works in browser | Already handled, but needs SSR guard audit |

---

## Appendix A — Key File Reference

| File | Purpose |
|---|---|
| `middleware.ts` | Auth routing, edge-level protection |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client + admin client |
| `lib/utils.ts` | All utility functions |
| `types/index.ts` | All TypeScript interfaces |
| `supabase/schema.sql` | Complete database schema |
| `app/layout.tsx` | Root layout with fonts and PWA |
| `app/admin/layout.tsx` | Admin panel shell |
| `components/admin/AdminSidebar.tsx` | Navigation with grouped sections |
| `hooks/useCart.tsx` | Cart state machine |
| `public/manifest.json` | PWA configuration |
| `public/sw.js` | Service worker |
| `next.config.js` | Next.js configuration |
| `tailwind.config.ts` | Design tokens |
| `.env.local.example` | Environment variable template |
| `DEPLOY.md` | Deployment + client onboarding guide |

---

## Appendix B — Architecture Decision Records (ADRs)

**ADR-001: Supabase as backend-as-a-service**
*Decision:* Use Supabase instead of a custom Express/Node.js backend.
*Rationale:* Zero infrastructure to manage, built-in auth, realtime, RLS-based multi-tenancy, and generous free tier for an early-stage product. All domain features needed for v1 are achievable within Supabase's capabilities.
*Trade-off:* Vendor lock-in to PostgreSQL + Supabase API. Mitigated by keeping business logic in service layer rather than Supabase Edge Functions.

**ADR-002: Next.js App Router over Pages Router**
*Decision:* Use App Router (Next.js 13+) as the primary routing architecture.
*Rationale:* Server Components eliminate client-side data fetching waterfalls for the menu (critical path). Layout nesting aligns perfectly with the multi-app structure (customer / admin / kitchen).
*Trade-off:* Some patterns are newer and documentation is still evolving. Mitigated by conservative use of well-established patterns.

**ADR-003: Cloudinary for media over Supabase Storage**
*Decision:* Use Cloudinary for image storage and transformation.
*Rationale:* Cloudinary's free tier includes image transformation (auto-WebP, resize, crop) that would require custom code with Supabase Storage.
*Trade-off:* Additional vendor. Mitigated by keeping Cloudinary usage isolated to `lib/cloudinary.ts`.

**ADR-004: Tailwind CSS over component library (MUI, Chakra)**
*Decision:* Build a custom design system on Tailwind rather than adopting a pre-built library.
*Rationale:* Restaurant-specific brand identity (dark admin, warm customer app) requires deep customization. Tailwind provides full control with minimal CSS output.
*Trade-off:* More initial component work. Already well underway in `globals.css`.

---

*This document reflects the complete architecture of Menuara as built across Sessions 3, 4, and 5. It should be treated as a living document — update it as the codebase evolves.*

*Last updated: May 2026*
