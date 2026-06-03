# MENUARA Pre-Deployment Checklist

Use this checklist to verify everything is ready before deploying to production.

---

## ✅ Architecture Verification

- [ ] All 11 services are implemented and exportable
  ```bash
  grep -r "export class" src/backend/services/*.ts | wc -l
  # Should show: 11
  ```

- [ ] All 7 controllers are implemented
  ```bash
  grep -r "export" src/backend/controllers/*.ts | wc -l
  # Should show multiple export statements
  ```

- [ ] All repositories have tenant filtering
  ```bash
  grep -r "restaurant_id" src/backend/repositories/*.ts
  # Should find restaurant_id in all queries
  ```

- [ ] Middleware pipeline is complete
  ```bash
  ls -la src/backend/middleware/
  # Should show: auth, rbac, rateLimit, validation, tenant, logger
  ```

- [ ] Error handling is in place
  ```bash
  ls -la src/backend/errors/
  # Should show: AppError, AuthError, NotFoundError, ValidationError, handler
  ```

- [ ] All Zod schemas are defined
  ```bash
  ls -la src/backend/validations/
  # Should show schemas for order, menu, payment, restaurant, coupon, staff
  ```

---

## ✅ Frontend Verification

- [ ] UI components exist
  ```bash
  ls -la src/frontend/components/ui/
  # Should show: Button, Input, Badge, Card, Modal, Toast, Spinner
  ```

- [ ] Admin components organized
  ```bash
  ls -la src/frontend/components/admin/
  # Should show: AdminSidebar, AdminTopbar
  ```

- [ ] Customer components present
  ```bash
  ls -la src/frontend/components/customer/
  # Should show: CategoryNav, DishCard, DishModal, FoodTypeFilter, MenuStickyNav
  ```

- [ ] Hooks are available
  ```bash
  ls -la src/frontend/hooks/
  # Should show: useCart, useRealtime, useAuth, useRestaurant, useOfflineQueue, useToast, useCategoryScrollSpy
  ```

- [ ] Providers are configured
  ```bash
  ls -la src/frontend/providers/
  # Should show: CartProvider, ToastProvider, RealtimeProvider
  ```

---

## ✅ Routes Verification

- [ ] Auth routes exist
  ```bash
  ls -la src/app/\(auth\)/
  # Should show: login/, register/
  ```

- [ ] Customer routes exist
  ```bash
  ls -la src/app/\(customer\)/\[slug\]/\[tableId\]/
  # Should show: cart/, orders/, bill/, ar/, layout.tsx, page.tsx
  ```

- [ ] Admin routes complete
  ```bash
  ls -la src/app/\(admin\)/admin/ | wc -l
  # Should show many pages (18+)
  ```

- [ ] API v1 routes configured
  ```bash
  ls -la src/app/api/v1/
  # Should show: menu/, orders/, payments/, restaurants/
  ```

- [ ] Kitchen display exists
  ```bash
  ls -la src/app/\(admin\)/kitchen/
  # Should show: page.tsx
  ```

---

## ✅ Database Verification

- [ ] Schema file exists and is complete
  ```bash
  wc -l supabase/schema.sql
  # Should be 300+ lines
  ```

- [ ] All 20 tables are defined
  ```bash
  grep -c "CREATE TABLE" supabase/schema.sql
  # Should show: 20
  ```

- [ ] Migrations exist
  ```bash
  ls -la supabase/migrations/
  # Should show: 001_initial_schema.sql (minimum)
  ```

- [ ] Seed data available
  ```bash
  ls -la supabase/seed.sql
  # Should exist
  ```

---

## ✅ Configuration Verification

- [ ] Supabase clients configured
  ```bash
  ls -la src/config/supabase/
  # Should show: server.ts, client.ts, admin.ts or similar
  ```

- [ ] Constants defined
  ```bash
  ls -la src/config/constants.ts
  # Should exist
  ```

- [ ] Route constants available
  ```bash
  grep -c "ROUTES" src/config/routes.ts
  # Should find route exports
  ```

- [ ] Types are complete
  ```bash
  ls -la src/types/
  # Should show: database.ts, domain.ts, api.ts, index.ts
  ```

---

## ✅ Build & Lint Verification

- [ ] TypeScript compiles without errors
  ```bash
  npm run build
  # Should complete successfully
  ```

- [ ] Linting passes
  ```bash
  npm run lint
  # Should show no errors
  ```

- [ ] No missing dependencies
  ```bash
  npm install
  # Should not show warnings (or only security advisories)
  ```

- [ ] Type checking strict
  ```bash
  cat tsconfig.json | grep -A 10 "compilerOptions"
  # Should show strict: true
  ```

---

## ✅ Environment Configuration

- [ ] Environment variables template exists
  ```bash
  ls -la .env.local.example
  # Should exist
  ```

- [ ] Vercel config available
  ```bash
  ls -la vercel.json
  # Should exist
  ```

- [ ] Next.js config proper
  ```bash
  ls -la next.config.js
  # Should exist
  ```

- [ ] Middleware configured
  ```bash
  ls -la middleware.ts
  # Should exist and handle auth
  ```

---

## ✅ Security Checklist

- [ ] No service role keys in client code
  ```bash
  grep -r "SUPABASE_SERVICE_ROLE_KEY" src/
  # Should NOT find anything (only in env.local)
  ```

- [ ] Auth middleware active
  ```bash
  grep -r "verifyToken\|getUser" src/app/api/
  # Should find auth checks
  ```

- [ ] RBAC checks present
  ```bash
  grep -r "role.*admin\|role.*manager" src/backend/
  # Should find role checks
  ```

- [ ] Rate limiting configured
  ```bash
  grep -r "rateLimit\|rate.limit" src/backend/middleware/
  # Should find rate limit logic
  ```

- [ ] Validation on all inputs
  ```bash
  grep -r "\.parse\|\.validate" src/backend/controllers/
  # Should find Zod validation
  ```

- [ ] CORS configured (if needed)
  ```bash
  grep -r "CORS\|cors" middleware.ts
  # May exist for API routes
  ```

---

## ✅ Testing Setup

- [ ] Tests directory structure ready
  ```bash
  ls -la tests/
  # Should show: unit/, integration/, e2e/
  ```

- [ ] Package.json has test scripts
  ```bash
  grep -r "\"test" package.json
  # Should show test scripts
  ```

- [ ] ESLint configured
  ```bash
  ls -la .eslintrc.json or .eslintrc.js
  # Should exist
  ```

---

## ✅ Documentation Verification

- [ ] README exists and is updated
  ```bash
  ls -la README.md
  # Should exist and be informative
  ```

- [ ] MERGE_REPORT.md present
  ```bash
  ls -la MERGE_REPORT.md
  # Should exist
  ```

- [ ] DEPLOY.md available
  ```bash
  ls -la DEPLOY.md
  # Should exist
  ```

- [ ] ARCHITECTURE.md written
  ```bash
  ls -la ARCHITECTURE.md
  # Should exist (NEW - created during consolidation)
  ```

- [ ] DEVELOPER_QUICK_REFERENCE.md available
  ```bash
  ls -la DEVELOPER_QUICK_REFERENCE.md
  # Should exist (NEW - created during consolidation)
  ```

---

## ✅ Running the Application

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Run development server
npm run dev

# 4. Test application
# Open http://localhost:3000
# Test: Register → Login → Order → Checkout

# 5. Check build
npm run build
# Should complete without errors

# 6. Check types
npm run type-check
# Should pass without errors
```

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] `npm run lint` passes
- [ ] `npm run build` completes
- [ ] `npm run type-check` passes (if available)
- [ ] No console errors in browser DevTools
- [ ] No security warnings in dependencies
- [ ] Database schema migrations clean

### Functionality
- [ ] Auth flow works (register, login, logout)
- [ ] Customer ordering flow works (QR → menu → order → bill)
- [ ] Admin dashboard works (view orders, manage menu)
- [ ] Kitchen display works (real-time order updates)
- [ ] Real-time updates work (WebSocket connections)
- [ ] Offline mode works (PWA caching)

### Performance
- [ ] Lighthouse score 80+ (on mobile)
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] Bundle size reasonable
- [ ] Database queries have indexes

### Security
- [ ] HTTPS enabled
- [ ] Environment variables not exposed
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Zod validation on all inputs
- [ ] RBAC checks on admin routes
- [ ] RLS policies enabled in Supabase

### Operations
- [ ] Error monitoring configured (Sentry or similar)
- [ ] Logging working
- [ ] Backup strategy in place
- [ ] Incident response plan documented
- [ ] On-call rotation ready

---

## ✅ Deployment Steps

1. [ ] **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "MENUARA initial deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR/REPO.git
   git push -u origin main
   ```

2. [ ] **Deploy to Vercel**
   - Go to vercel.com
   - Connect GitHub repository
   - Set environment variables
   - Deploy

3. [ ] **Configure Supabase Production**
   - Go to Supabase dashboard
   - Set Auth redirect URLs
   - Enable Row-Level Security policies
   - Configure backup strategy

4. [ ] **Test Production**
   - Visit live URL
   - Test authentication
   - Place test order
   - Verify database writes
   - Check admin dashboard

5. [ ] **Monitor Production**
   - Check error logs
   - Monitor database performance
   - Watch user activity
   - Be ready to rollback

---

## ✅ Post-Deployment

- [ ] Monitor logs for errors
- [ ] Track user sign-ups
- [ ] Monitor database performance
- [ ] Verify email/WhatsApp notifications
- [ ] Check real-time order updates
- [ ] Validate payment processing
- [ ] Review user feedback
- [ ] Plan next features

---

## Common Issues & Fixes

### Build Fails
- Check TypeScript errors: `npm run build`
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Deployment Fails
- Check environment variables in Vercel
- Verify Supabase credentials
- Check database migrations ran
- Look at build logs

### Runtime Errors
- Check browser console for client errors
- Check server logs for backend errors
- Verify Supabase connection
- Check for missing environment variables

### Performance Issues
- Run Lighthouse audit
- Check database query performance
- Reduce bundle size
- Enable caching

### Real-time Not Working
- Check WebSocket connections
- Verify Supabase realtime enabled
- Check subscription channel names
- Look for connection errors in console

---

## Sign-Off

- [ ] Team lead approval
- [ ] Security review complete
- [ ] Performance accepted
- [ ] Documentation reviewed
- [ ] Ready for production launch

---

**Last Updated**: May 28, 2026  
**Status**: Ready for Pre-Deployment Review  
**Next Step**: Execute checklist items and deploy when all items are checked
