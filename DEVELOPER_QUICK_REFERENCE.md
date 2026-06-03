# MENUARA Developer Quick Reference

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Run dev server
npm run dev

# 4. Open browser
# http://localhost:3000
```

---

## Folder Structure at a Glance

```
menuara/
├── src/
│   ├── app/              ← Next.js pages & API routes (routing only)
│   ├── backend/          ← Controllers, services, repositories, middleware
│   ├── frontend/         ← React components, hooks, providers
│   ├── config/           ← Supabase clients, constants, routes
│   ├── types/            ← TypeScript definitions
│   └── lib/              ← Shared utilities
├── supabase/             ← Database schema, migrations, functions
├── tests/                ← Test structure (unit, integration, e2e)
├── public/               ← Static assets
├── middleware.ts         ← Auth middleware
├── MERGE_REPORT.md       ← What was merged (read this first)
├── DEPLOY.md             ← Deployment instructions
├── ARCHITECTURE.md       ← Detailed architecture guide (read this second)
├── FINAL_CONSOLIDATION_PLAN.md  ← Status & recommendations
└── package.json
```

---

## Common Tasks

### Add a New Admin Page

1. **Create page file**:
   ```bash
   mkdir -p src/app/\(admin\)/admin/my-feature
   touch src/app/\(admin\)/admin/my-feature/page.tsx
   ```

2. **Write page component**:
   ```typescript
   "use client";
   import { useRestaurant } from "@/frontend/hooks/useRestaurant";
   
   export default function MyFeaturePage() {
     const { restaurantId } = useRestaurant();
     
     return <div>Feature content here</div>;
   }
   ```

3. **Create API route** (if needed):
   ```bash
   mkdir -p src/app/api/v1/my-feature
   touch src/app/api/v1/my-feature/route.ts
   ```

4. **Implement controller**:
   ```typescript
   // src/backend/controllers/myfeature.controller.ts
   import { NextRequest, NextResponse } from "next/server";
   
   export async function getMyFeature(req: NextRequest) {
     // Implementation
   }
   ```

5. **Implement service**:
   ```typescript
   // src/backend/services/myfeature.service.ts
   export class MyFeatureService {
     static async get(restaurantId: string) {
       // Business logic
     }
   }
   ```

6. **Add repository**:
   ```typescript
   // src/backend/repositories/myfeature.repository.ts
   export class MyFeatureRepository {
     static async fetchFromDB(restaurantId: string) {
       // DB queries
     }
   }
   ```

### Add a New API Endpoint

```typescript
// src/app/api/v1/my-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MyService } from "@/backend/services/my.service";
import { MySchema } from "@/backend/validations/my.schema";
import { AppError } from "@/backend/errors/AppError";

export async function POST(req: NextRequest) {
  try {
    const restaurantId = req.headers.get("x-restaurant-id");
    const body = await req.json();
    
    // Validate input
    const validated = MySchema.parse(body);
    
    // Call service
    const result = await MyService.create(restaurantId, validated);
    
    // Return response
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toJSON() },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}
```

### Add a New Component

```typescript
// src/frontend/components/customer/MyComponent.tsx
"use client";
import React from "react";
import { Button } from "@/frontend/components/ui/Button";

interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

export function MyComponent({ title, onClick }: MyComponentProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <Button onClick={onClick}>Action</Button>
    </div>
  );
}
```

### Add a Zod Validation Schema

```typescript
// src/backend/validations/my.schema.ts
import { z } from "zod";

export const createMySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  quantity: z.number().int().positive("Must be positive"),
});

export type CreateMyDTO = z.infer<typeof createMySchema>;
```

### Use Custom Hook in Component

```typescript
// src/frontend/hooks/useMyFeature.ts
"use client";
import { useState, useEffect } from "react";

export function useMyFeature(restaurantId: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/my-feature?restaurantId=${restaurantId}`);
        const { data } = await res.json();
        setData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [restaurantId]);

  return { data, loading, error };
}

// Usage in component
function MyComponent() {
  const { data, loading } = useMyFeature(restaurantId);
  return loading ? <div>Loading...</div> : <div>{data.name}</div>;
}
```

---

## Code Patterns

### Error Handling
```typescript
throw new NotFoundError("Resource not found");
throw new AuthError("Unauthorized");
throw new ValidationError("Invalid input", { field: "error_message" });
```

### Service Layer Pattern
```typescript
export class MyService {
  static async create(restaurantId: string, data: CreateDTO) {
    // 1. Validate data (already done in controller, but can re-validate)
    // 2. Check preconditions (e.g., resource exists)
    // 3. Perform business logic
    // 4. Call repositories
    // 5. Trigger side effects (notifications, etc.)
    // 6. Return result
  }
}
```

### Repository Layer Pattern
```typescript
export class MyRepository {
  static async create(restaurantId: string, data: any) {
    const client = createAdminClient();
    const { data: result } = await client
      .from("my_table")
      .insert({ restaurant_id: restaurantId, ...data })
      .select()
      .single();
    return result;
  }

  static async findById(restaurantId: string, id: string) {
    const client = createAdminClient();
    const { data, error } = await client
      .from("my_table")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("id", id)
      .single();
    
    if (error) throw new NotFoundError("Not found");
    return data;
  }

  static async list(restaurantId: string) {
    const client = createAdminClient();
    const { data } = await client
      .from("my_table")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
    
    return data;
  }
}
```

---

## Important Imports

### Backend
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";
import { OrderService } from "@/backend/services/order.service";
import { NotFoundError, AuthError } from "@/backend/errors";
import { z } from "zod";
```

### Frontend
```typescript
import { useRestaurant } from "@/frontend/hooks/useRestaurant";
import { Button } from "@/frontend/components/ui/Button";
import { CartProvider } from "@/frontend/providers/CartProvider";
```

### Config
```typescript
import { GST_RATES, ORDER_LIMITS } from "@/config/constants";
import { ROUTES } from "@/config/routes";
```

---

## Database

### Common Queries Pattern
```typescript
// Always include restaurant_id filter
const { data } = await client
  .from("orders")
  .select("*")
  .eq("restaurant_id", restaurantId)  // ← MANDATORY
  .eq("status", "pending");

// For joins
const { data } = await client
  .from("orders")
  .select(`
    *,
    session:sessions(id, guest_count),
    items:order_items(id, quantity, price)
  `)
  .eq("restaurant_id", restaurantId);
```

### Add Migration
```bash
# 1. Create migration file
touch supabase/migrations/NNN_add_feature.sql

# 2. Write SQL
ALTER TABLE orders ADD COLUMN feature_column TEXT;

# 3. Run locally
supabase migration up

# 4. Test, then commit
```

---

## Middleware & Auth

### Check Authentication
```typescript
// In route handlers
import { getUser } from "@/config/supabase/server";

const user = await getUser();
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Check Role
```typescript
const user = await getUser();
if (user.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Extract Restaurant ID
```typescript
// From context (set by middleware)
const restaurantId = req.headers.get("x-restaurant-id");
if (!restaurantId) {
  return NextResponse.json({ error: "Bad Request" }, { status: 400 });
}
```

---

## Testing

### Run Tests
```bash
# Unit tests
npm run test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Write Test
```typescript
// tests/unit/services/my.service.test.ts
describe("MyService", () => {
  describe("create", () => {
    it("should create resource", async () => {
      const result = await MyService.create("restaurant-123", testData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should throw error if invalid", async () => {
      await expect(
        MyService.create("restaurant-123", invalidData)
      ).rejects.toThrow();
    });
  });
});
```

---

## Debugging

### Enable Logging
```typescript
// In controllers or services
console.log("Processing order:", { orderId, restaurantId });
```

### Check Database
```typescript
// In Supabase dashboard
// Go to SQL Editor and write queries directly
SELECT * FROM orders WHERE restaurant_id = '...';
```

### Check Environment Variables
```bash
# Verify .env.local is set
cat .env.local

# Check if app sees them
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
```

### Browser DevTools
```typescript
// Check network requests
// Check console for errors
// Check localStorage for auth tokens
// Check IndexedDB for cached data
```

---

## Deployment

### Vercel
```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys
# Set env vars in Vercel dashboard
```

### Docker
```bash
docker build -t menuara .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  menuara
```

---

## Performance Tips

1. **Use Server Components** when possible (less JS sent to client)
2. **Cache Restaurant Data** (low churn, high frequency)
3. **Lazy Load AR Assets** (heavy files)
4. **Index Database Columns**: restaurant_id, session_id, status, created_at
5. **Use Connection Pooling** for DB (Supabase has built-in)
6. **Compress Images** before storing

---

## Security Checklist

- ✅ Never expose service role keys to client
- ✅ Always filter by restaurant_id
- ✅ Validate all inputs with Zod
- ✅ Check auth on protected routes
- ✅ Check roles on admin routes
- ✅ Use environment variables for secrets
- ✅ Enable RLS policies in Supabase
- ✅ Rate limit public endpoints

---

## Resources

- **Architecture Guide**: Read `ARCHITECTURE.md`
- **Merge Report**: Read `MERGE_REPORT.md`
- **Deployment**: Read `DEPLOY.md`
- **Consolidation Status**: Read `FINAL_CONSOLIDATION_PLAN.md`
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Need Help?

Check these in order:
1. Error message in console
2. `ARCHITECTURE.md` for patterns
3. Existing code for examples
4. Supabase documentation
5. Post in team chat with error details

---

**Last Updated**: May 28, 2026  
**Version**: 1.0  
**Status**: Production-Ready
