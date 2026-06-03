# MENUARA — Setup Guide

## What's been built in this session

| File | Description |
|---|---|
| `app/page.tsx` | Landing page |
| `app/(auth)/login/page.tsx` | Staff / owner login |
| `app/(auth)/register/page.tsx` | Restaurant registration (3-step) |
| `app/admin/layout.tsx` | Admin panel shell with auth check |
| `app/admin/page.tsx` | Live dashboard |
| `app/admin/orders/page.tsx` | Real-time order management |
| `app/admin/tables/page.tsx` | Table status + QR management |
| `app/kitchen/[restaurantId]/page.tsx` | Kitchen display screen |
| `components/admin/AdminSidebar.tsx` | Full navigation sidebar |
| `components/admin/AdminTopbar.tsx` | Header with user menu |
| `supabase/schema.sql` | Complete database schema |
| `types/index.ts` | All TypeScript types |
| `lib/utils.ts` | Utilities (formatINR, GST calc, etc.) |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `middleware.ts` | Auth route protection |
| `app/globals.css` | Full design system |
| `tailwind.config.ts` | MENUARA design tokens |

---

## Step 1 — Install dependencies

```bash
npm install
```

---

## Step 2 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `menuara` → choose a region near India (Singapore)
3. Go to **Project Settings → API**
4. Copy `Project URL` and `anon public` key

---

## Step 3 — Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL and anon key.

---

## Step 4 — Run the database schema

1. Go to Supabase → **SQL Editor**
2. Open `supabase/schema.sql`
3. Paste the entire file and click **Run**

This creates all tables, indexes, RLS policies, and realtime subscriptions.

---

## Step 5 — Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## What to test

1. **`/register`** → Create a restaurant → 3-step flow → creates auth user + restaurant + tables in Supabase
2. **`/login`** → Sign in → redirects to `/admin`
3. **`/admin`** → Dashboard with live stats
4. **`/admin/orders`** → Real-time order feed (open two tabs to test live sync)
5. **`/admin/tables`** → Table grid, status changes, QR download
6. **`/kitchen/[restaurantId]`** → Full-screen kitchen display

---

## Next session builds

- [ ] Menu management (add/edit dishes, categories)
- [ ] Customer-facing menu app (`/[slug]/[tableId]`)
- [ ] Cart and ordering flow
- [ ] AR upload system in admin
- [ ] WebAR customer viewer
- [ ] Billing + GST invoice
- [ ] Analytics dashboard

---

## Design system

- **Fonts:** Playfair Display (headings) + DM Sans (body)
- **Brand color:** `#C17D3C` (amber gold)
- **Theme:** Dark admin, warm cream customer
- **Components:** See `globals.css` for `.btn-primary`, `.card-dark`, `.input-dark`, etc.
