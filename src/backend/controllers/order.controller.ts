import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { AuthError } from "@/backend/errors/AuthError";
import { validate } from "@/backend/middleware/validation.middleware";
import { OrderService } from "@/backend/services/order.service";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import {
  billQuerySchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderPricingSchema,
  placeOrderSchema,
  sessionOrdersQuerySchema,
  updateOrderStatusSchema,
} from "@/backend/validations/order.schema";
import { created, ok } from "@/backend/utils/apiResponse";

function parseQuery<T>(schema: { parse: (input: unknown) => T }, searchParams: URLSearchParams): T {
  const raw = Object.fromEntries(searchParams.entries());
  try {
    return schema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Invalid query parameters", error.flatten().fieldErrors);
    }
    throw error;
  }
}

/**
 * Lists orders for the authenticated admin's restaurant.
 * restaurantId is resolved from the session — NEVER from the query string.
 */
export async function listOrders(req: NextRequest) {
  try {
    const { restaurantId } = await resolveRestaurantAccess();
    const query = parseQuery(listOrdersQuerySchema, req.nextUrl.searchParams);
    const orders = await OrderService.list({ ...query, restaurantId });
    return ok(orders);
  } catch (error) {
    return handleError(error);
  }
}

export async function listSessionOrders(req: NextRequest) {
  try {
    const { sessionId } = parseQuery(sessionOrdersQuerySchema, req.nextUrl.searchParams);
    const orders = await OrderService.listBySession(sessionId);
    return ok(orders);
  } catch (error) {
    return handleError(error);
  }
}

export async function createOrder(req: NextRequest, restaurantId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const validated = validate(createOrderSchema, body);
    const result = await OrderService.create(validated, restaurantId);
    return created(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function placeOrder(req: NextRequest, restaurantId: string, options?: { isCustomer?: boolean }) {
  try {
    const isCustomer = options?.isCustomer ?? false;
    const sessionToken = req.cookies.get("session_token")?.value;
    const idempotencyKey = req.headers.get("idempotency-key");
 
    if (isCustomer) {
      if (!sessionToken) {
        throw new AuthError("No dining session cookie found", 401, "UNAUTHORIZED_SESSION");
      }
    } else {
      const access = await resolveRestaurantAccess();
      if (restaurantId !== access.restaurantId) {
        throw new AuthError("Forbidden", 403, "FORBIDDEN");
      }
    }
 
    const body = await req.json();
    if (body.sessionId === "preview" || body.tableId === "preview") {
      throw new ValidationError("Orders cannot be placed in preview mode");
    }
    const validated = validate(placeOrderSchema, body);

    if (idempotencyKey) {
      const { status, payload } = await OrderService.placeIdempotent(validated, restaurantId, idempotencyKey, {
        ...options,
        sessionToken,
      });
      if (status === 200) {
        return ok(payload);
      }
      return created(payload);
    }

    const result = await OrderService.place(validated, restaurantId, {
      ...options,
      sessionToken,
    });
    return created(result);
  } catch (error) {
    return handleError(error);
  }
}


export async function quoteOrderPricing(req: NextRequest, restaurantId: string) {
  try {
    const body = await req.json();
    const validated = validate(orderPricingSchema, body);
    const pricing = await OrderService.quotePricing(validated, restaurantId);
    return ok(pricing);
  } catch (error) {
    return handleError(error);
  }
}

export async function updateOrderStatus(
  req: NextRequest,
  restaurantId: string,
  orderId: string
) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const validated = validate(updateOrderStatusSchema, body);
    const order = await OrderService.updateStatus(restaurantId, orderId, validated);
    return ok(order);
  } catch (error) {
    return handleError(error);
  }
}

export async function getSessionBill(req: NextRequest) {
  try {
    const query = parseQuery(billQuerySchema, req.nextUrl.searchParams);
    const bill = await OrderService.getBill(query.slug, query.tableId);
    return ok(bill);
  } catch (error) {
    return handleError(error);
  }
}
