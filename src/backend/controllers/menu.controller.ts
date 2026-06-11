import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { AuthError } from "@/backend/errors/AuthError";
import { validate } from "@/backend/middleware/validation.middleware";
import { MenuService } from "@/backend/services/menu.service";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import {
  createCategorySchema,
  createComboSchema,
  createDishSchema,
  listMenuQuerySchema,
  restaurantScopeQuerySchema,
  toggleDishAvailabilitySchema,
  updateCategorySchema,
  updateComboSchema,
  updateDishSchema,
  upsertArAssetSchema,
} from "@/backend/validations/menu.schema";
import { created, noContent, ok } from "@/backend/utils/apiResponse";

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

export async function getMenu(req: NextRequest) {
  try {
    const query = parseQuery(listMenuQuerySchema, req.nextUrl.searchParams);
    return ok(await MenuService.getMenu(query));
  } catch (error) {
    console.error("getMenu controller error:", error);
    return handleError(error);
  }
}

export async function listCategories(req: NextRequest) {
  try {
    const { restaurantId } = parseQuery(restaurantScopeQuerySchema, req.nextUrl.searchParams);
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    return ok(await MenuService.listCategories(restaurantId, activeOnly));
  } catch (error) {
    return handleError(error);
  }
}

export async function createCategory(req: NextRequest, restaurantId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const dto = validate(createCategorySchema, body);
    return created(await MenuService.createCategory(restaurantId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateCategory(
  req: NextRequest,
  restaurantId: string,
  categoryId: string
) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const dto = validate(updateCategorySchema, body);
    return ok(await MenuService.updateCategory(restaurantId, categoryId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteCategory(restaurantId: string, categoryId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    await MenuService.deleteCategory(restaurantId, categoryId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}

export async function listDishes(req: NextRequest) {
  try {
    const { restaurantId } = parseQuery(restaurantScopeQuerySchema, req.nextUrl.searchParams);
    const availableOnly = req.nextUrl.searchParams.get("availableOnly") === "true";
    const admin = req.nextUrl.searchParams.get("admin") === "true";
    return ok(await MenuService.listDishes(restaurantId, { availableOnly, admin }));
  } catch (error) {
    return handleError(error);
  }
}

export async function getDish(req: NextRequest, restaurantId: string, dishId: string) {
  try {
    const includeAr = req.nextUrl.searchParams.get("includeAr") === "true";
    return ok(await MenuService.getDish(restaurantId, dishId, includeAr));
  } catch (error) {
    return handleError(error);
  }
}

export async function createDish(req: NextRequest, restaurantId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const dto = validate(createDishSchema, body);
    return created(await MenuService.createDish(restaurantId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateDish(req: NextRequest, restaurantId: string, dishId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const dto = validate(updateDishSchema, body);
    return ok(await MenuService.updateDish(restaurantId, dishId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteDish(restaurantId: string, dishId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    await MenuService.deleteDish(restaurantId, dishId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}

export async function toggleDishAvailability(
  req: NextRequest,
  restaurantId: string,
  dishId: string
) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const { isAvailable } = validate(toggleDishAvailabilitySchema, body);
    return ok(await MenuService.toggleDishAvailability(restaurantId, dishId, isAvailable));
  } catch (error) {
    return handleError(error);
  }
}

export async function getDishAr(restaurantId: string, dishId: string) {
  try {
    const result = await MenuService.getDishForAr(restaurantId, dishId);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function upsertDishAr(req: NextRequest, restaurantId: string, dishId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const dto = validate(upsertArAssetSchema, body);
    return ok(await MenuService.upsertArAsset(restaurantId, dishId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function listCombos(req: NextRequest) {
  try {
    const { restaurantId } = parseQuery(restaurantScopeQuerySchema, req.nextUrl.searchParams);
    return ok(await MenuService.listCombos(restaurantId));
  } catch (error) {
    return handleError(error);
  }
}

export async function createCombo(req: NextRequest, restaurantId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const dto = validate(createComboSchema, body);
    return created(await MenuService.createCombo(restaurantId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateCombo(req: NextRequest, restaurantId: string, comboId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    const body = await req.json();
    const dto = validate(updateComboSchema, body);
    return ok(await MenuService.updateCombo(restaurantId, comboId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteCombo(restaurantId: string, comboId: string) {
  try {
    const access = await resolveRestaurantAccess();
    if (restaurantId !== access.restaurantId) {
      throw new AuthError("Forbidden", 403, "FORBIDDEN");
    }
    await MenuService.deleteCombo(restaurantId, comboId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
