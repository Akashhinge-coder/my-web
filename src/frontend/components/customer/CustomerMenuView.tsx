"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Search,
  Flame,
  Sparkles,
  Plus,
  Minus,
  X,
  UtensilsCrossed,
} from "lucide-react";
import { useCustomerMenu } from "@/frontend/hooks/useMenu";
import { useCart } from "@/frontend/hooks/useCart";
import { useCartPricing } from "@/frontend/hooks/useCartPricing";
import { useCategoryScrollSpy } from "@/frontend/hooks/useCategoryScrollSpy";
import { useSessionIdentity } from "@/frontend/hooks/useSessionIdentity";
import { dishDataType } from "@/lib/foodType";
import { formatINR, cn, isValidImageSrc } from "@/lib/utils";
import type { Category, Dish, Combo } from "@/types/domain";
import { dishHasPublishedAr, type CustomerDish } from "@/types/menu";

const FOOD_FILTERS = [
  { value: "all", label: "All" },
  { value: "veg", label: "Veg Only" },
  { value: "nonveg", label: "Non-Veg Only" },
] as const;

type FoodFilterValue = (typeof FOOD_FILTERS)[number]["value"];

const FOOD_TYPE_STYLES: Record<string, string> = {
  veg: "border-green-600",
  non_veg: "border-red-600",
  vegan: "border-emerald-600",
  jain: "border-amber-600",
};

const BRAND_GRADIENT = "linear-gradient(135deg,#C17D3C,#E8A85F)";


function matchesFoodFilter(dish: Dish, filter: FoodFilterValue): boolean {
  if (filter === "all") return true;
  const type = dishDataType(dish.food_type);
  return filter === "veg" ? type === "veg" : type === "nonveg";
}

function matchesSearch(dish: Dish, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    dish.name.toLowerCase().includes(q) ||
    (dish.name_hindi?.toLowerCase().includes(q) ?? false) ||
    (dish.description?.toLowerCase().includes(q) ?? false)
  );
}

interface DishCardProps {
  dish: CustomerDish;
  quantity: number;
  slug: string;
  tableId: string;
  onInfo: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

function DishCard({
  dish,
  quantity,
  slug,
  tableId,
  onInfo,
  onAdd,
  onIncrement,
  onDecrement,
}: DishCardProps) {
  const router = useRouter();
  const hasAR = dishHasPublishedAr(dish);
  const borderColor = FOOD_TYPE_STYLES[dish.food_type] || "border-green-600";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden flex">
      <div
        className={cn(
          "w-1 flex-shrink-0",
          borderColor.replace("border-", "bg-")
        )}
      />

      <div className="flex-1 p-4 flex gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center flex-shrink-0",
                borderColor
              )}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  dish.food_type === "non_veg"
                    ? "bg-red-600"
                    : dish.food_type === "vegan"
                      ? "bg-emerald-600"
                      : dish.food_type === "jain"
                        ? "bg-amber-600"
                        : "bg-green-600"
                )}
              />
            </div>
            {dish.is_special && (
              <span className="text-[10px] text-brand font-semibold uppercase tracking-wide">
                ★ Special
              </span>
            )}
          </div>

          <button type="button" onClick={onInfo} className="text-left w-full">
            <h3 className="font-semibold text-ink text-sm leading-tight mb-1">
              {dish.name}
            </h3>
            {dish.description && (
              <p className="text-xs text-ink-3 line-clamp-2 mb-2 leading-relaxed">
                {dish.description}
              </p>
            )}
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-ink text-base">
              {formatINR(dish.price)}
            </span>
            {dish.spice_level > 0 && (
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(dish.spice_level, 3) }).map(
                  (_, i) => (
                    <Flame key={i} className="w-3 h-3 text-orange-500" />
                  )
                )}
              </div>
            )}
            {hasAR && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/${slug}/${tableId}/ar/${dish.id}`);
                }}
                className="flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-medium"
              >
                <Sparkles className="w-2.5 h-2.5" />
                AR
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <button
            type="button"
            className="w-20 h-20 rounded-xl overflow-hidden bg-surface-secondary border border-border relative"
            onClick={onInfo}
          >
            {isValidImageSrc(dish.image_url) ? (
              <Image
                src={dish.image_url!}
                alt={dish.name}
                width={80}
                height={80}
                sizes="80px"
                quality={75}
                loading="lazy"
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-2xl">
                🍽
              </span>
            )}
          </button>

          {tableId !== "preview" && (
            quantity === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="w-20 flex items-center justify-center gap-1 py-1.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 min-h-[44px]"
                style={{ background: BRAND_GRADIENT }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            ) : (
              <div className="w-20 flex items-center justify-between px-2 py-1 rounded-xl border-2 border-brand min-h-[44px]">
                <button
                  type="button"
                  onClick={onDecrement}
                  className="text-brand p-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-brand text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={onIncrement}
                  className="text-brand p-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

interface DishModalProps {
  dish: CustomerDish;
  quantity: number;
  slug: string;
  tableId: string;
  onClose: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

function DishModal({
  dish,
  quantity,
  slug,
  tableId,
  onClose,
  onAdd,
  onIncrement,
  onDecrement,
}: DishModalProps) {
  const router = useRouter();
  const hasAR = dishHasPublishedAr(dish);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slide-up max-h-[85vh] overflow-y-auto">
        {isValidImageSrc(dish.image_url) ? (
          <div className="relative h-56 w-full">
            <Image
              src={dish.image_url!}
              alt={dish.name}
              fill
              sizes="(max-width: 640px) 100vw, 448px"
              quality={80}
              className="object-cover"
              priority
            />
            {hasAR && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/${slug}/${tableId}/ar/${dish.id}`)
                }
                className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 backdrop-blur-sm text-purple-700 text-xs font-semibold border border-purple-200 shadow-card"
              >
                <Sparkles className="w-3.5 h-3.5" />
                View in AR
              </button>
            )}
          </div>
        ) : (
          <div
            className="h-32 flex items-center justify-center text-5xl"
            style={{ background: BRAND_GRADIENT }}
          >
            🍽
          </div>
        )}

        <div className="p-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/90 backdrop-blur-sm text-ink-3 hover:text-ink shadow-card"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <h2 className="font-display text-2xl font-semibold text-ink mb-1 pr-10">
            {dish.name}
          </h2>
          {dish.name_hindi && (
            <p className="text-ink-3 text-sm mb-3">{dish.name_hindi}</p>
          )}

          {dish.description && (
            <p className="text-ink-3 text-sm leading-relaxed mb-4">
              {dish.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {dish.allergy_tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 capitalize"
              >
                ⚠ {tag}
              </span>
            ))}
            {dish.spice_level > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                {"🌶".repeat(dish.spice_level)} Spice level {dish.spice_level}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border gap-3">
            <span className="font-display text-2xl font-semibold text-ink">
              {formatINR(dish.price)}
            </span>
            {tableId !== "preview" ? (
              quantity === 0 ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="px-6 py-3 rounded-xl text-white font-semibold text-sm min-h-[44px]"
                  style={{ background: BRAND_GRADIENT }}
                >
                  Add to cart
                </button>
              ) : (
                <div className="flex items-center gap-3 border-2 border-brand rounded-xl px-3 py-2">
                  <button
                    type="button"
                    onClick={onDecrement}
                    className="text-brand p-1"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-brand w-6 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={onIncrement}
                    className="text-brand p-1"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )
            ) : (
              <span className="text-xs text-brand font-medium uppercase tracking-wide">
                Preview Mode
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ComboCardProps {
  combo: Combo;
  dishes: CustomerDish[];
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onInfo: () => void;
}

function ComboCard({
  combo,
  dishes,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  onInfo,
}: ComboCardProps) {
  const comboDishes = useMemo(() => {
    return (combo.dish_ids ?? [])
      .map((id) => dishes.find((d) => d.id === id))
      .filter(Boolean) as CustomerDish[];
  }, [combo.dish_ids, dishes]);

  const firstDishImage = comboDishes[0]?.image_url;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden flex w-full">
      <div className="w-1 flex-shrink-0 bg-purple-600" />
      <div className="flex-1 p-4 flex gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border border-purple-200">
              Combo Meal
            </span>
            {combo.savings_amount > 0 && (
              <span className="text-[10px] bg-green-50 text-green-700 font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border border-green-200">
                Save {formatINR(combo.savings_amount)}
              </span>
            )}
          </div>

          <button type="button" onClick={onInfo} className="text-left w-full">
            <h3 className="font-semibold text-ink text-sm leading-tight mb-1">
              {combo.name}
            </h3>
            <p className="text-xs text-ink-3 mb-2 leading-relaxed line-clamp-2">
              Includes: {comboDishes.map((d) => d.name).join(" + ")}
            </p>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-ink text-base">
              {formatINR(combo.combo_price)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <button
            type="button"
            className="w-20 h-20 rounded-xl overflow-hidden bg-surface-secondary border border-border relative flex items-center justify-center"
            onClick={onInfo}
          >
            {isValidImageSrc(firstDishImage) ? (
              <img
                src={firstDishImage!}
                alt={combo.name}
                loading="lazy"
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-2xl">🍱</span>
            )}
          </button>

          {quantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="w-20 flex items-center justify-center gap-1 py-1.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 min-h-[44px]"
              style={{ background: BRAND_GRADIENT }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          ) : (
            <div className="w-20 flex items-center justify-between px-2 py-1 rounded-xl border-2 border-brand min-h-[44px]">
              <button
                type="button"
                onClick={onDecrement}
                className="text-brand p-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-brand text-sm">{quantity}</span>
              <button
                type="button"
                onClick={onIncrement}
                className="text-brand p-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ComboModalProps {
  combo: Combo;
  dishes: CustomerDish[];
  quantity: number;
  onClose: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

function ComboModal({
  combo,
  dishes,
  quantity,
  onClose,
  onAdd,
  onIncrement,
  onDecrement,
}: ComboModalProps) {
  const comboDishes = useMemo(() => {
    return (combo.dish_ids ?? [])
      .map((id) => dishes.find((d) => d.id === id))
      .filter(Boolean) as CustomerDish[];
  }, [combo.dish_ids, dishes]);

  const firstDishImage = comboDishes[0]?.image_url;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slide-up max-h-[85vh] overflow-y-auto">
        {isValidImageSrc(firstDishImage) ? (
          <div className="relative h-56 w-full">
            <img
              src={firstDishImage!}
              alt={combo.name}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div
            className="h-32 flex items-center justify-center text-5xl animate-pulse"
            style={{ background: BRAND_GRADIENT }}
          >
            🍱
          </div>
        )}

        <div className="p-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/90 backdrop-blur-sm text-ink-3 hover:text-ink shadow-card"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md border border-purple-200">
              Combo Meal
            </span>
            {combo.savings_amount > 0 && (
              <span className="text-[10px] bg-green-50 text-green-700 font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md border border-green-200">
                Save {formatINR(combo.savings_amount)}
              </span>
            )}
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink mb-3 pr-10">
            {combo.name}
          </h2>

          <div className="space-y-4 mb-6">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
              What's Included:
            </p>
            <div className="space-y-2">
              {comboDishes.map((dish) => (
                <div key={dish.id} className="flex items-center gap-3 bg-surface-secondary p-3 rounded-2xl border border-border">
                  {isValidImageSrc(dish.image_url) ? (
                    <img
                      src={dish.image_url!}
                      alt={dish.name}
                      className="w-10 h-10 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-lg border border-border">
                      🍽
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm leading-tight">{dish.name}</p>
                    {dish.description && (
                      <p className="text-xs text-ink-3 truncate">{dish.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border gap-3">
            <span className="font-display text-2xl font-semibold text-ink">
              {formatINR(combo.combo_price)}
            </span>
            {quantity === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="px-6 py-3 rounded-xl text-white font-semibold text-sm min-h-[44px]"
                style={{ background: BRAND_GRADIENT }}
              >
                Add to cart
              </button>
            ) : (
              <div className="flex items-center gap-3 border-2 border-brand rounded-xl px-3 py-2">
                <button
                  type="button"
                  onClick={onDecrement}
                  className="text-brand p-1"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-brand w-6 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={onIncrement}
                  className="text-brand p-1"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerMenuView({
  slug,
  tableId,
}: {
  slug: string;
  tableId: string;
}) {
  const router = useRouter();
  const { data, loading } = useCustomerMenu(slug, tableId);
  const cart = useCart();
  const { pricing } = useCartPricing(cart.state.restaurantId, cart.state.items);
  const { identity, approveGuest } = useSessionIdentity();

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState<FoodFilterValue>("all");
  const [selectedDish, setSelectedDish] = useState<CustomerDish | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);

  const dishes = useMemo(
    () => (data?.dishes ?? []).filter((d) => d.is_available),
    [data?.dishes]
  );

  const combosCategory = useMemo(() => {
    const hasCombos = data?.combos && data.combos.length > 0;
    if (!hasCombos) return null;
    return {
      id: "combos-category-id",
      restaurant_id: cart.state.restaurantId,
      name: "Combo Meals",
      sort_order: -10,
      is_active: true,
    } as Category;
  }, [data?.combos, cart.state.restaurantId]);

  const categories = useMemo(() => {
    const base = data?.categories ?? [];
    if (combosCategory) {
      return [combosCategory, ...base];
    }
    return base;
  }, [data?.categories, combosCategory]);

  const categoryIds = useMemo(
    () => categories.map((c) => c.id),
    [categories]
  );

  const { activeCategoryId, scrollToCategory, setSectionRef } =
    useCategoryScrollSpy(categoryIds);

  const filteredDishes = useMemo(
    () =>
      dishes.filter(
        (d) => matchesFoodFilter(d, foodFilter) && matchesSearch(d, search)
      ),
    [dishes, foodFilter, search]
  );

  const groupedSections = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    return sorted
      .map((category) => {
        if (category.id === "combos-category-id") {
          const matchedCombos = (data?.combos ?? []).filter((c) => {
            const q = search.trim().toLowerCase();
            return !q || c.name.toLowerCase().includes(q);
          });
          return {
            category,
            dishes: [],
            combos: matchedCombos,
          };
        }
        return {
          category,
          dishes: filteredDishes.filter((d) => d.category_id === category.id),
          combos: [],
        };
      })
      .filter((section) => section.dishes.length > 0 || (section.combos && section.combos.length > 0));
  }, [categories, filteredDishes, data?.combos, search]);

  function cartHandlers(dish: Dish) {
    const qty = cart.getQuantity(dish.id);
    return {
      quantity: qty,
      onAdd: () => cart.addItem(dish),
      onIncrement: () => cart.increment(dish.id),
      onDecrement: () => cart.decrement(dish.id),
    };
  }

  function comboCartHandlers(combo: Combo) {
    const qty = cart.getQuantity(combo.id);
    const firstDishImage = (combo.dish_ids ?? [])
      .map(id => dishes.find(d => d.id === id))
      .filter(Boolean)[0]?.image_url;
    return {
      quantity: qty,
      onAdd: () => cart.addItem({
        id: combo.id,
        itemType: "combo",
        name: combo.name,
        price: Number(combo.combo_price),
        imageUrl: firstDishImage ?? null,
      }),
      onIncrement: () => cart.increment(combo.id),
      onDecrement: () => cart.decrement(combo.id),
    };
  }

  if (cart.state.sessionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-brand animate-bounce"
          style={{ background: BRAND_GRADIENT }}
        >
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-ink">QR Scan Required</h2>
        <p className="text-ink-3 text-sm max-w-sm">
          {cart.state.sessionError === "QR scan required to order" 
            ? "Please scan the physical QR code located on your table to browse the menu and place orders."
            : cart.state.sessionError}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-brand"
          style={{ background: BRAND_GRADIENT }}
        >
          <UtensilsCrossed className="w-8 h-8 animate-pulse" />
        </div>
        <p className="text-ink-3 text-sm font-medium">Loading menu…</p>
        <div className="w-full max-w-sm space-y-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-surface-secondary animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
        <UtensilsCrossed className="w-12 h-12 text-ink-4" />
        <p className="text-ink font-semibold">Menu unavailable</p>
        <p className="text-ink-3 text-sm">Please scan the table QR again.</p>
      </div>
    );
  }

  const { restaurant, table } = data;

  return (
    <div
      className={cn(
        "min-h-screen bg-surface pb-6",
        cart.totalItems > 0 && "pb-28"
      )}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-40 border-b border-white/10 shadow-lg"
        style={{ background: "linear-gradient(180deg,#1A1512 0%,#2A221C 100%)" }}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url!}
                alt={`${restaurant.name} logo`}
                className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-white/10"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: BRAND_GRADIENT }}
              >
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display font-semibold text-white text-sm truncate">
                {restaurant.name}
              </p>
              <p className="text-xs text-white/60">
                Table {table.table_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSearch((v) => !v)}
              className="p-2.5 rounded-xl text-white/70 hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Search menu"
            >
              <Search className="w-4 h-4" />
            </button>
            {tableId !== "preview" && (
              <button
                type="button"
                onClick={() => router.push(`/${slug}/${tableId}/cart`)}
                className="relative p-2.5 rounded-xl text-white/70 hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="View cart"
              >
                <ShoppingCart className="w-4 h-4" />
                {cart.totalItems > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    {cart.totalItems > 99 ? "99+" : cart.totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 py-2.5 text-sm rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand/50"
                placeholder="Search dishes..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="px-4 pb-3">
          <div
            className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            role="group"
            aria-label="Food type filter"
          >
            {FOOD_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFoodFilter(f.value)}
                className={cn(
                  "snap-start px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border min-h-[44px]",
                  foodFilter === f.value
                    ? "border-white/30 bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                    : "border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-0.5">
            {categories.map((cat: Category) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    "relative snap-start px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-h-[44px]",
                    isActive ? "text-white" : "text-white/60 hover:text-white/90"
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-white/15 border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.12)]" />
                  )}
                  <span className="relative z-10">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu body */}
      <div className="px-4 pt-5 space-y-8">
        {groupedSections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink-3 text-sm">No dishes match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFoodFilter("all");
              }}
              className="mt-3 text-sm text-brand font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          groupedSections.map(({ category, dishes: sectionDishes, combos: sectionCombos }) => (
            <section
              key={category.id}
              ref={setSectionRef(category.id)}
              data-category-id={category.id}
              className="scroll-mt-44"
            >
              <h2 className="font-display text-xl font-semibold text-ink mb-1">
                {category.name}
              </h2>
              {category.name_hindi && (
                <p className="text-xs text-ink-3 mb-4">{category.name_hindi}</p>
              )}
              {!category.name_hindi && <div className="mb-4" />}

              <div className="space-y-3 animate-fade-in">
                {category.id === "combos-category-id" ? (
                  sectionCombos?.map((combo) => {
                    const handlers = comboCartHandlers(combo);
                    return (
                      <ComboCard
                        key={combo.id}
                        combo={combo}
                        dishes={dishes}
                        onInfo={() => setSelectedCombo(combo)}
                        {...handlers}
                      />
                    );
                  })
                ) : (
                  sectionDishes.map((dish) => {
                    const handlers = cartHandlers(dish);
                    return (
                      <DishCard
                        key={dish.id}
                        dish={dish}
                        slug={slug}
                        tableId={tableId}
                        onInfo={() => setSelectedDish(dish)}
                        {...handlers}
                      />
                    );
                  })
                )}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Bottom cart bar */}
      {cart.totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 safe-bottom">
          <button
            type="button"
            onClick={() => router.push(`/${slug}/${tableId}/cart`)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white font-semibold shadow-brand active:scale-[0.98] transition-transform"
            style={{ background: BRAND_GRADIENT }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span>
                {cart.totalItems} item{cart.totalItems !== 1 ? "s" : ""}
              </span>
            </div>
            <span className="font-display text-lg">
              {formatINR(pricing.grandTotal)}
            </span>
          </button>
        </div>
      )}

      {selectedDish && (
        <DishModal
          dish={selectedDish}
          slug={slug}
          tableId={tableId}
          onClose={() => setSelectedDish(null)}
          {...cartHandlers(selectedDish)}
        />
      )}

      {selectedCombo && (
        <ComboModal
          combo={selectedCombo}
          dishes={dishes}
          onClose={() => setSelectedCombo(null)}
          {...comboCartHandlers(selectedCombo)}
        />
      )}
    </div>
  );
}
