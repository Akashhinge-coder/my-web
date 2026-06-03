# MENUARA — Deployment Guide

## What you have after all 5 sessions

### Admin Panel Pages
- `/admin` — Live dashboard with revenue, orders, tables
- `/admin/orders` — Real-time order management
- `/admin/tables` — Table status + QR generation
- `/admin/reservations` — Booking management
- `/admin/waitlist` — Walk-in queue with WhatsApp
- `/admin/menu` — Full dish + category management
- `/admin/menu/ar` — 5-angle AR photo uploader
- `/admin/combos` — Bundle meals at discount
- `/admin/happy-hours` — Time-based discounts
- `/admin/billing` — GST invoice + cash/card + split bill
- `/admin/coupons` — Discount code engine
- `/admin/loyalty` — Points-based rewards
- `/admin/analytics` — Revenue charts + peak hours
- `/admin/feedback` — Star ratings dashboard
- `/admin/integrations` — WhatsApp EOD report
- `/admin/staff` — Team management + roles
- `/admin/inventory` — Stock tracking + alerts
- `/admin/suppliers` — Vendor management
- `/admin/settings` — Restaurant profile + GST

### Customer App
- `/[slug]/[tableId]` — Full menu with filters
- `/[slug]/[tableId]/cart` — Cart with GST breakdown
- `/[slug]/[tableId]/orders` — Place + track orders
- `/[slug]/[tableId]/bill` — Bill + payment options
- `/[slug]/[tableId]/ar/[dishId]` — WebAR food viewer

### System
- `/kitchen/[restaurantId]` — Full-screen kitchen display
- `/register` — 3-step restaurant onboarding
- `/login` — Staff + owner login
- `/superadmin` — Platform dashboard
- Service worker — PWA offline support

---

## Deploy to Vercel (FREE)

### Step 1 — Push code to GitHub
1. Go to **github.com** → New repository → name it `menuara`
2. Open VS Code terminal and run:
```bash
git init
git add .
git commit -m "MENUARA initial build"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/menuara.git
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to **vercel.com** → Sign up with GitHub
2. Click **New Project**
3. Select your `menuara` repository
4. Click **Deploy** — Vercel auto-detects Next.js

### Step 3 — Add environment variables on Vercel
1. Go to your project on Vercel → **Settings** → **Environment Variables**
2. Add each one:

```
NEXT_PUBLIC_SUPABASE_URL        = your supabase url
NEXT_PUBLIC_SUPABASE_ANON_KEY   = your anon key
SUPABASE_SERVICE_ROLE_KEY       = your service role key
NEXT_PUBLIC_APP_URL             = https://your-app.vercel.app
```

3. Click **Save** → Go to **Deployments** → **Redeploy**

### Step 4 — Update Supabase for production
Go to Supabase → **Authentication** → **URL Configuration**
Add your Vercel URL:
```
Site URL: https://your-app.vercel.app
Redirect URLs: https://your-app.vercel.app/**
```

### Step 5 — Test live
Open `https://your-app.vercel.app` — MENUARA is live!

---

## Add custom domain (menuara.in)

### Buy the domain
1. Go to **GoDaddy** or **Namecheap**
2. Search `menuara.in` → buy it (~₹800/year)

### Connect to Vercel
1. Vercel → your project → **Settings** → **Domains**
2. Type `menuara.in` → **Add**
3. Vercel shows you DNS records to add
4. Go to your domain registrar → DNS settings → add the records
5. Wait 5-30 minutes → domain is live

### Update env variable
Change `NEXT_PUBLIC_APP_URL` to `https://menuara.in`
Redeploy on Vercel.

---

## Final checklist before first client

### Admin panel
- [ ] Register a test restaurant
- [ ] Add 5+ categories
- [ ] Add 10+ dishes with photos
- [ ] Set up AR for 2-3 dishes
- [ ] Add staff members
- [ ] Generate and print QR codes
- [ ] Create 1 test coupon
- [ ] Set GST number in settings

### Customer flow
- [ ] Scan QR from a printed code (not just URL)
- [ ] Browse menu on mobile
- [ ] Add 3 items to cart
- [ ] Place order → verify in admin
- [ ] Mark order as cooking → served in kitchen
- [ ] Request bill → verify GST calculation
- [ ] Test cash payment confirmation
- [ ] Check order in billing page

### AR test
- [ ] Upload 5 angles for one dish
- [ ] Publish AR
- [ ] Open customer menu on phone
- [ ] Tap AR button → camera opens
- [ ] Tap table → dish appears
- [ ] Rotate phone → angles switch

### Performance
- [ ] Menu loads in under 3 seconds on mobile
- [ ] Offline: turn off WiFi → menu still loads
- [ ] Turn WiFi back on → orders sync

---

## How to onboard a real restaurant

1. They fill the `/register` form (10 minutes)
2. You help them add their menu from photos
3. Take 5 photos of 2-3 signature dishes for AR
4. Print QR codes (one per table) using the admin QR page
5. Laminate them and place on tables
6. Done — restaurant is live

---

## Revenue from your first clients

At ₹30,000 per restaurant (software + marketing):
- 1 restaurant = ₹30,000
- 5 restaurants = ₹1,50,000
- 10 restaurants = ₹3,00,000
- 20 restaurants = ₹6,00,000

Target: **5 restaurants in month 1** → ₹1.5 lakh

The product is ready. Go get clients. 🚀
