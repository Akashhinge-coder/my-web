import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { validate } from "@/backend/middleware/validation.middleware";
import { OrderService } from "@/backend/services/order.service";
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

export async function listOrders(req: NextRequest) {
  try {
    const query = parseQuery(listOrdersQuerySchema, req.nextUrl.searchParams);
    const orders = await OrderService.list(query);
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
    const body = await req.json();
    const validated = validate(createOrderSchema, body);
    const result = await OrderService.create(validated, restaurantId);
    return created(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function placeOrder(req: NextRequest, restaurantId: string) {
  try {
    const body = await req.json();
    const validated = validate(placeOrderSchema, body);
    const result = await OrderService.place(validated, restaurantId);
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
