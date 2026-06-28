"use client";

import { useMemo, useState, useEffect } from "react";
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
  Receipt,
  SlidersHorizontal,
} from "lucide-react";
import { useCustomerMenu } from "@/frontend/hooks/useMenu";
import { useCart } from "@/frontend/hooks/useCart";
import { useCartPricing } from "@/frontend/hooks/useCartPricing";
import { useCategoryScrollSpy } from "@/frontend/hooks/useCategoryScrollSpy";
import { useSessionIdentity } from "@/frontend/hooks/useSessionIdentity";
import { ordersApi } from "@/frontend/api/orders";
import { dishDataType } from "@/lib/foodType";
import { formatINR, cn, isValidImageSrc } from "@/lib/utils";
import type { Category, Dish, Combo } from "@/types/domain";
import { dishHasPublishedAr, type CustomerDish } from "@/types/menu";
import { FloatingCategoryButton } from "./FloatingCategoryButton";
import { FilterModal, type FilterState, DEFAULT_FILTER_STATE } from "./FilterModal";

const FOOD_TYPE_STYLES: Record<string, string> = {
  veg: "border-green-600",
  non_veg: "border-red-600",
  vegan: "border-emerald-600",
  jain: "border-amber-600",
};

const BRAND_GRADIENT = "linear-gradient(135deg,#C17D3C,#E8A85F)";

// Old filter functions removed as they are now handled inline

const FOOD_FILTERS = [
  { value: "all", label: "All" },
  { value: "veg", label: "Veg Only" },
  { value: "nonveg", label: "Non-Veg Only" },
] as const;

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
  const vegIconColor =
    dish.food_type === "non_veg"
      ? "bg-red-600"
      : dish.food_type === "vegan"
        ? "bg-emerald-600"
        : dish.food_type === "jain"
          ? "bg-amber-600"
          : "bg-green-600";

  return (
    <div className="menu-card relative rounded-[1.5rem] flex flex-col overflow-hidden h-full transition-all duration-300 active:scale-[0.98] hover:shadow-[0_8px_32px_rgba(245,158,11,0.15)]">
      {/* Subtle top-edge lighting effect */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent z-20 pointer-events-none" />
      {/* Top Image Section */}
      <div
        className="relative w-full aspect-[4/3] bg-midnight-tertiary cursor-pointer overflow-hidden flex-shrink-0"
        onClick={onInfo}
      >
        {isValidImageSrc(dish.image_url) ? (
          <Image
            src={dish.image_url!}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            quality={75}
            loading="lazy"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            🍽
          </div>
        )}

        {/* Overlay gradient for text readability at bottom of image if needed */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-50 pointer-events-none" />

        {/* Veg/Non-veg icon top-left over image (Square style) */}
        <div className="absolute top-2.5 left-2.5">
          <div
            className="w-5 h-5 rounded-sm flex items-center justify-center drop-shadow-md bg-midnight-card/40"
            style={{ border: `2px solid ${dish.food_type === "non_veg" ? "#EF4444" : "#22C55E"}` }}
            title={dish.food_type === "non_veg" ? "Non-Vegetarian" : "Vegetarian"}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: dish.food_type === "non_veg" ? "#EF4444" : "#22C55E" }}
            />
          </div>
        </div>

        {hasAR && (
          <div className="absolute bottom-2 right-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${slug}/${tableId}/ar/${dish.id}`);
              }}
              className="flex items-center gap-1 text-[10px] text-[#E8A85F] bg-midnight/90 backdrop-blur-sm border border-[#E8A85F]/50 px-2 py-1 rounded-full font-semibold shadow-sm"
            >
              <Sparkles className="w-2.5 h-2.5" />
              AR
            </button>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3.5 flex-1 flex flex-col">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {dish.is_special && (
            <span className="font-sans text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#FCD34D", background: "rgba(217,119,6,0.2)" }}>
              ✨ Chef Special
            </span>
          )}
          {dish.spice_level > 0 && (
            <span className="font-sans text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#F87171", background: "rgba(239,68,68,0.15)" }}>
              🌶️ Spicy
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onInfo}
          className="text-left w-full mb-3"
        >
          <h3 className="font-display font-bold text-white text-[17px] leading-tight line-clamp-1 mb-1">
            {dish.name}
          </h3>
          {dish.name_hindi && (
            <p className="text-[11px] text-[#E8A85F] font-medium leading-tight mb-1.5">
              {dish.name_hindi}
            </p>
          )}
          {dish.description && (
            <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed font-medium">
              {dish.description}
            </p>
          )}
          {dish.description_hindi && (
            <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed font-medium mt-1">
              {dish.description_hindi}
            </p>
          )}
        </button>

        {dish.allergy_tags && dish.allergy_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {dish.allergy_tags.map(tag => (
              <span key={tag} className="text-[9px] uppercase tracking-wider text-zinc-400 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.05]">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-sans font-bold text-[17px]" style={{ color: "#F59E0B" }}>
              {formatINR(dish.price)}
            </span>
            {dish.dish_size && (
              <span className="text-[10px] font-bold text-zinc-400 bg-white/[0.05] px-1.5 py-0.5 rounded-sm">
                {dish.dish_size}
              </span>
            )}
          </div>

          <div className="flex-shrink-0">
            {tableId !== "preview" &&
              (quantity === 0 ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="add-to-cart-btn shadow-sm"
                  aria-label="Add to cart"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              ) : (
                <div className="flex items-center justify-between bg-midnight-tertiary border border-[#F59E0B]/50 rounded-full overflow-hidden h-[34px] w-[80px] shadow-sm">
                  <button
                    type="button"
                    onClick={onDecrement}
                    className="text-[#F59E0B] w-7 h-full flex items-center justify-center active:bg-[#F59E0B]/10 hover:bg-[#F59E0B]/5 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-white text-[13px]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={onIncrement}
                    className="text-[#F59E0B] w-7 h-full flex items-center justify-center active:bg-[#F59E0B]/10 hover:bg-[#F59E0B]/5 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
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

  const vegIconColor = dish.food_type === "non_veg" ? "bg-red-600" : dish.food_type === "vegan" ? "bg-emerald-600" : dish.food_type === "jain" ? "bg-amber-600" : "bg-green-600";
  const borderColor = FOOD_TYPE_STYLES[dish.food_type] || "border-green-600";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} role="presentation" />
      
      <div className="relative bg-midnight-card w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col shadow-2xl">
        {/* Drag handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/40 rounded-full z-20 sm:hidden" />
        
        {/* Scrollable content */}
        <div className="overflow-y-auto scrollbar-hide flex-1 pb-24">
          <div className="relative h-[40vh] min-h-[280px] w-full bg-midnight-tertiary">
            {isValidImageSrc(dish.image_url) ? (
              <Image src={dish.image_url!} alt={dish.name} fill sizes="(max-width: 640px) 100vw, 448px" quality={85} className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🍽</div>
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />

            <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            {hasAR && (
              <button type="button" onClick={() => router.push(`/${slug}/${tableId}/ar/${dish.id}`)} className="absolute bottom-4 right-4 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-dark-secondary backdrop-blur-md text-purple-400 text-sm font-bold shadow-lg active:scale-95 transition-transform z-10 border border-purple-900/50">
                <Sparkles className="w-4 h-4 text-purple-500" />
                View in AR
              </button>
            )}
          </div>

          <div className="p-5 pt-6 bg-midnight-card relative">
            {/* Veg/Non-veg icon nicely overlapping */}
            <div className="absolute -top-4 left-5 bg-midnight-card p-1 rounded-md shadow-sm border border-midnight-border">
              <div className={cn("w-4 h-4 rounded-sm border-2 flex items-center justify-center", borderColor)}>
                <div className={cn("w-2 h-2 rounded-full", vegIconColor)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3 mt-2">
              {dish.is_special && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-brand/10 text-brand px-2 py-1 rounded-md">
                  <Flame className="w-3.5 h-3.5 text-brand" /> Bestseller
                </span>
              )}
              {dish.spice_level > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-red-900/40 text-red-400 px-2 py-1 rounded-md">
                  {"🌶".repeat(dish.spice_level)} Spicy
                </span>
              )}
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1.5 leading-tight pr-2">
              {dish.name}
            </h2>
            {dish.name_hindi && (
              <p className="text-[#E8A85F] text-sm font-medium mb-4">{dish.name_hindi}</p>
            )}

            {dish.description && (
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-6">
                {dish.description}
              </p>
            )}
            {dish.description_hindi && (
              <p className="text-zinc-500 text-[13px] leading-relaxed mb-6 -mt-3">
                {dish.description_hindi}
              </p>
            )}

            {dish.allergy_tags && dish.allergy_tags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Contains</h4>
                <div className="flex flex-wrap gap-2">
                  {dish.allergy_tags.map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1.5 rounded-lg bg-[#E8A85F]/10 text-[#E8A85F] border border-[#E8A85F]/20 font-medium capitalize flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8A85F]" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky bottom Add to Cart bar inside the modal */}
        <div className="absolute bottom-0 left-0 right-0 bg-dark border-t border-midnight-border p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-0.5">Price</span>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-white">
                  {formatINR(dish.price)}
                </span>
                {dish.dish_size && (
                  <span className="text-xs font-bold text-zinc-400 bg-white/[0.05] px-2 py-1 rounded-md">
                    {dish.dish_size}
                  </span>
                )}
              </div>
            </div>

            {tableId !== "preview" ? (
              quantity === 0 ? (
                <button type="button" onClick={onAdd} className="flex-1 max-w-[200px] px-6 py-3.5 rounded-2xl text-white font-bold text-[15px] shadow-[0_4px_14px_rgba(193,125,60,0.3)] active:scale-95 transition-transform" style={{ background: BRAND_GRADIENT }}>
                  Add to cart
                </button>
              ) : (
                <div className="flex-1 max-w-[200px] flex items-center justify-between bg-midnight border-2 border-brand rounded-2xl overflow-hidden h-[52px]">
                  <button type="button" onClick={onDecrement} className="text-brand w-14 h-full flex items-center justify-center active:bg-brand/10" aria-label="Decrease quantity">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-brand text-lg w-10 text-center">
                    {quantity}
                  </span>
                  <button type="button" onClick={onIncrement} className="text-brand w-14 h-full flex items-center justify-center active:bg-brand/10" aria-label="Increase quantity">
                    <Plus className="w-5 h-5" />
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
    <div className="menu-card relative rounded-[1.5rem] flex flex-col overflow-hidden h-full w-full transition-all duration-300 active:scale-[0.98] hover:shadow-[0_8px_32px_rgba(245,158,11,0.15)]">
      {/* Subtle top-edge lighting effect */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/30 to-transparent z-20 pointer-events-none" />
      {/* Top Image Section */}
      <div 
        className="relative w-full aspect-[4/3] bg-midnight-tertiary cursor-pointer overflow-hidden flex-shrink-0"
        onClick={onInfo}
      >
        {isValidImageSrc(firstDishImage) ? (
          <Image
            src={firstDishImage!}
            alt={combo.name}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            quality={75}
            loading="lazy"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍱</div>
        )}
        
        {/* Overlay gradient for text readability at bottom of image if needed */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-50 pointer-events-none" />
      </div>

      {/* Content Section */}
      <div className="p-3.5 flex-1 flex flex-col">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <span className="font-sans text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#FCD34D", background: "rgba(217,119,6,0.2)" }}>
            🔥 Combo
          </span>
          {combo.savings_amount > 0 && (
            <span className="font-sans text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#86EFAC", background: "rgba(34,197,94,0.15)" }}>
              ✨ Save {formatINR(combo.savings_amount)}
            </span>
          )}
        </div>

        <button type="button" onClick={onInfo} className="text-left w-full mb-3 flex-1">
          <h3 className="font-display font-bold text-white text-[17px] leading-tight line-clamp-1 mb-1">
            {combo.name}
          </h3>
          <ul className="space-y-1.5 mt-1.5">
            {comboDishes.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-zinc-400 font-medium">
                <span className="text-[#E8A85F] font-bold">✓</span>
                <span className="line-clamp-1">{d.name}</span>
              </li>
            ))}
          </ul>
        </button>

        <div className="mt-auto flex items-center justify-between gap-1">
          <span className="font-sans font-bold text-[17px]" style={{ color: "#F59E0B" }}>
            {formatINR(combo.combo_price)}
          </span>

          <div className="flex-shrink-0">
            {quantity === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="add-to-cart-btn shadow-sm"
                aria-label="Add to cart"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <div className="flex items-center justify-between bg-midnight-tertiary border border-[#F59E0B]/50 rounded-full overflow-hidden h-[34px] w-[80px] shadow-sm">
                <button
                  type="button"
                  onClick={onDecrement}
                  className="text-[#F59E0B] w-7 h-full flex items-center justify-center active:bg-[#F59E0B]/10 hover:bg-[#F59E0B]/5 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-white text-[13px]">{quantity}</span>
                <button
                  type="button"
                  onClick={onIncrement}
                  className="text-[#F59E0B] w-7 h-full flex items-center justify-center active:bg-[#F59E0B]/10 hover:bg-[#F59E0B]/5 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
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
  tableId: string;
}

function ComboModal({
  combo,
  dishes,
  quantity,
  onClose,
  onAdd,
  onIncrement,
  onDecrement,
  tableId,
}: ComboModalProps) {
  const comboDishes = useMemo(() => {
    return (combo.dish_ids ?? [])
      .map((id) => dishes.find((d) => d.id === id))
      .filter(Boolean) as CustomerDish[];
  }, [combo.dish_ids, dishes]);

  const firstDishImage = comboDishes[0]?.image_url;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} role="presentation" />
      
      <div className="relative bg-midnight-card w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col shadow-2xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/40 rounded-full z-20 sm:hidden" />
        
        <div className="overflow-y-auto scrollbar-hide flex-1 pb-24">
          <div className="relative h-[40vh] min-h-[280px] w-full bg-[#0B101E]">
            {isValidImageSrc(firstDishImage) ? (
              <img src={firstDishImage!} alt={combo.name} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">🍱</div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />

            <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors z-10">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 pt-6 bg-midnight-card relative">
            <div className="flex items-center gap-2 mb-3 mt-1">
              <span className="text-[11px] font-bold uppercase tracking-wide bg-[#E8A85F]/10 text-[#E8A85F] px-2.5 py-1 rounded-md border border-[#E8A85F]/20">
                🔥 Combo Meal
              </span>
              {combo.savings_amount > 0 && (
                <span className="text-[11px] font-bold uppercase tracking-wide bg-green-600 text-white px-2.5 py-1 rounded-md shadow-sm">
                  Save {formatINR(combo.savings_amount)}
                </span>
              )}
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight pr-2">
              {combo.name}
            </h2>

            <div className="space-y-4 mb-6">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                What's Included:
              </p>
              <div className="space-y-2">
                {comboDishes.map((dish) => (
                  <div key={dish.id} className="flex items-center gap-3 bg-midnight-tertiary p-3 rounded-2xl border border-midnight-border">
                    {isValidImageSrc(dish.image_url) ? (
                      <img src={dish.image_url!} alt={dish.name} className="w-12 h-12 rounded-xl object-cover border border-midnight-border shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-dark flex items-center justify-center text-xl border border-midnight-border shadow-sm">🍽</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-[15px] leading-tight mb-0.5">{dish.name}</p>
                      {dish.description && (
                        <p className="text-xs text-zinc-400 truncate">{dish.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-dark border-t border-midnight-border p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-0.5">Price</span>
              <span className="font-display text-2xl font-bold text-[#E8A85F]">
                {formatINR(combo.combo_price)}
              </span>
            </div>

            {tableId !== "preview" ? (
              quantity === 0 ? (
                <button type="button" onClick={onAdd} className="flex-1 max-w-[200px] px-6 py-3.5 rounded-2xl text-white font-bold text-[15px] shadow-[0_4px_14px_rgba(147,51,234,0.3)] active:scale-95 transition-transform bg-purple-600">
                  Add to cart
                </button>
              ) : (
                <div className="flex-1 max-w-[200px] flex items-center justify-between bg-midnight border-2 border-purple-500 rounded-2xl overflow-hidden h-[52px]">
                  <button type="button" onClick={onDecrement} className="text-purple-400 w-14 h-full flex items-center justify-center active:bg-purple-900/30" aria-label="Decrease quantity">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-purple-400 text-lg w-10 text-center">
                    {quantity}
                  </span>
                  <button type="button" onClick={onIncrement} className="text-purple-400 w-14 h-full flex items-center justify-center active:bg-purple-900/30" aria-label="Increase quantity">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )
            ) : (
              <span className="text-xs text-purple-400 font-medium uppercase tracking-wide">
                Preview Mode
              </span>
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

  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<CustomerDish | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  // Fetch active orders for the tracking badge
  useEffect(() => {
    if (!cart.state.sessionId || tableId === "preview") return;
    ordersApi.listBySession(cart.state.sessionId)
      .then((res: any) => {
        const active = res.filter((o: any) => ["pending", "cooking", "served"].includes(o.status));
        setActiveOrdersCount(active.length);
      })
      .catch(console.error);
  }, [cart.state.sessionId, tableId]);



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

  const filteredDishes = useMemo(() => {
    let result = dishes.filter((d) => d.is_available && matchesSearch(d, search));

    if (filterState.vegPreference !== "all") {
      result = result.filter((d) => {
        const type = dishDataType(d.food_type);
        return filterState.vegPreference === "veg" ? type === "veg" : type === "nonveg";
      });
    }

    if (filterState.topPicks) {
      result = result.filter(d => d.is_special);
    }

    if (filterState.dietaryPreference === "spicy") {
      result = result.filter(d => d.spice_level > 0);
    } else if (filterState.dietaryPreference === "kids") {
      result = result.filter(d => d.spice_level === 0);
    }

    if (filterState.sortBy === "price_asc") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (filterState.sortBy === "price_desc") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    return result;
  }, [dishes, search, filterState]);

  const groupedSections = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    return sorted
      .map((category) => {
        if (category.id === "combos-category-id") {
          const matchedCombos = (data?.combos ?? []).filter((c) => {
            const q = search.trim().toLowerCase();
            const matchesQuery = !q || c.name.toLowerCase().includes(q);
            if (!matchesQuery) return false;

            if (filterState.vegPreference !== "all") {
              const comboDishes = (c.dish_ids ?? [])
                .map(id => dishes.find(d => d.id === id))
                .filter(Boolean) as CustomerDish[];
              
              const isNonVeg = comboDishes.some(d => dishDataType(d.food_type) === "nonveg");
              
              if (filterState.vegPreference === "veg" && isNonVeg) return false;
              if (filterState.vegPreference === "nonveg" && !isNonVeg) return false;
            }

            return true;
          });
          
          if (filterState.sortBy === "price_asc") {
            matchedCombos.sort((a, b) => Number(a.combo_price) - Number(b.combo_price));
          } else if (filterState.sortBy === "price_desc") {
            matchedCombos.sort((a, b) => Number(b.combo_price) - Number(a.combo_price));
          }
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

  if (loading || cart.state.isBootstrapping) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-midnight px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_30px_rgba(193,125,60,0.4)]"
          style={{ background: BRAND_GRADIENT }}
        >
          <UtensilsCrossed className="w-8 h-8 animate-pulse" />
        </div>
        <p className="text-zinc-400 text-sm font-medium">Preparing menu…</p>
        <div className="w-full max-w-sm space-y-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-midnight-card border border-midnight-border shadow-[0_8px_30px_rgba(0,0,0,0.5)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (cart.state.sessionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-midnight px-6 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_30px_rgba(193,125,60,0.4)] animate-bounce"
          style={{ background: BRAND_GRADIENT }}
        >
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">QR Scan Required</h2>
        <p className="text-zinc-400 text-sm max-w-sm">
          {cart.state.sessionError === "QR scan required to order" 
            ? "Please scan the physical QR code located on your table to browse the menu and place orders."
            : cart.state.sessionError}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-midnight px-6 text-center">
        <UtensilsCrossed className="w-12 h-12 text-zinc-500" />
        <p className="text-white font-semibold">Menu unavailable</p>
        <p className="text-zinc-400 text-sm">Please scan the table QR again.</p>
      </div>
    );
  }

  const { restaurant, table } = data;

  return (
    <div
      className={cn(
        "min-h-screen bg-midnight pb-6",
        cart.totalItems > 0 && "pb-28"
      )}
    >
      {/* Hero Section */}
      <section
        className="relative flex flex-col justify-end min-h-[65vh] overflow-hidden"
        style={{ minHeight: "65dvh" }}
        aria-label="Restaurant hero"
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=800&auto=format&fit=crop')" }}
          aria-hidden="true"
        />

        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 40%, rgba(5,5,5,0.95) 85%, #000000 100%)",
          }}
          aria-hidden="true"
        />

        {/* Top-right utility icons (Absolute over hero) */}
        {tableId !== "preview" && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/${slug}/${tableId}/orders`)}
              className="relative p-2.5 rounded-xl bg-midnight/40 backdrop-blur-md border border-white/10 shadow-sm text-white hover:bg-midnight/60 transition-colors flex items-center justify-center"
              aria-label="Order History"
            >
              <Receipt className="w-4 h-4" />
              {activeOrdersCount > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-[#0B101E] animate-ping" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-[#0B101E]" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/${slug}/${tableId}/cart`)}
              className="relative p-2.5 rounded-xl bg-midnight/40 backdrop-blur-md border border-white/10 shadow-sm text-white hover:bg-midnight/60 transition-colors flex items-center justify-center"
              aria-label="View cart"
            >
              <ShoppingCart className="w-4 h-4" />
              {cart.totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#0B101E] shadow-sm bg-[#F59E0B]"
                >
                  {cart.totalItems > 99 ? "99+" : cart.totalItems}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 px-5 pb-10 flex flex-col gap-5">
          {/* Logo & Restaurant Name */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                boxShadow: "0 0 20px rgba(245,158,11,0.35)",
              }}
            >
              {restaurant.logo_url ? (
                 <img src={restaurant.logo_url} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                 <div className="w-full h-full flex items-center justify-center text-[#0B101E] text-[18px] font-bold">
                   {restaurant.name[0]}
                 </div>
              )}
            </div>
            <div>
              <p className="font-display text-[#F59E0B] text-xl font-bold tracking-wider leading-none">
                {restaurant.name}
              </p>
              <p className="font-sans text-xs text-gray-400 tracking-widest uppercase mt-0.5">
                Fine Dining
              </p>
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight text-balance" style={{ color: "#F9FAFB" }}>
            Authentic Indian
            <br />
            <span style={{ color: "#F59E0B" }}>Flavours</span> Crafted
            <br />
            Fresh Every Day
          </h1>

          <p className="font-sans text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
            Table {table.table_number} {identity?.name ? `· ${identity.name}` : ""}
            {identity && (
               <>
                 <span className="text-white/20 mx-1.5">•</span>
                 <span className="capitalize" style={{ color: "#F59E0B" }}>{identity.role}</span>
               </>
            )}
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                const nav = document.getElementById("sticky-nav-container");
                if (nav) nav.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 py-3.5 rounded-2xl font-sans font-semibold text-sm tracking-wide active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                color: "#0a0e17",
                boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
              }}
            >
              Explore Menu
            </button>
            <button
              type="button"
              onClick={() => scrollToCategory("combos-category-id")}
              className="flex-1 py-3.5 rounded-2xl font-sans font-semibold text-sm tracking-wide active:scale-[0.97]"
              style={{
                background: "rgba(31,41,55,0.8)",
                border: "1px solid rgba(245,158,11,0.25)",
                color: "#F59E0B",
              }}
            >
              Chef Specials
            </button>
          </div>
        </div>
      </section>

      {/* Sticky Filters & Category Nav */}
      <div id="sticky-nav-container" className="sticky top-0 z-40 category-nav shadow-[0_4px_20px_rgba(0,0,0,0.5)] pt-4 pb-1">
        {/* Sticky Search Bar (Compact) */}
        <div className="px-4 mb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="w-11 h-11 flex items-center justify-center bg-midnight-card border border-midnight-border rounded-xl text-zinc-400 hover:text-white transition-colors relative"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {/* Notification dot if filters active */}
              {(filterState.sortBy !== "none" || filterState.vegPreference !== "all" || filterState.topPicks || filterState.dietaryPreference !== "all") && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand" />
              )}
            </button>
            <div className="relative flex-1">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
               <input
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-11 py-2.5 h-11 text-sm rounded-xl bg-midnight-card border border-midnight-border text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#E8A85F]/50 shadow-sm transition-all"
                 placeholder="Search dishes..."
               />
               {search && (
                 <button
                   type="button"
                   onClick={() => setSearch("")}
                   className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                 >
                   <X className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        </div>

        {/* Food Filters */}
        <div className="px-4 pb-2 border-t border-midnight-border/50 pt-2">
          <div
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            role="group"
          >
            {FOOD_FILTERS.map((f) => {
               // Assign icons/dots for filters
               let dot = null;
               if (f.value === "veg") dot = <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />;
               if (f.value === "nonveg") dot = <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />;

               return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilterState(prev => ({ ...prev, vegPreference: f.value as "all" | "veg" | "nonveg" }))}
                  className={cn(
                    "veg-filter-btn snap-start flex items-center gap-1.5",
                    filterState.vegPreference === f.value && "veg-filter-btn--active"
                  )}
                >
                  {dot} {f.label}
                </button>
               );
            })}
          </div>
        </div>
      </div>

      {/* Menu body */}
      <div className="px-4 pt-5 space-y-8">
        
        {/* Guest Pending Approval Banner */}
        {identity?.status === "pending" && (
          <div className="bg-blue-950/40 border border-blue-900/50 rounded-3xl p-5 mb-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 bg-blue-900/50 text-blue-400 rounded-2xl flex flex-shrink-0 items-center justify-center shadow-sm">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h3 className="font-display font-bold text-blue-100 text-[17px] mb-1">Waiting for Host</h3>
                <p className="text-sm text-blue-200/80 leading-relaxed pr-2">
                  You can browse the menu right now. You'll be able to place orders as soon as the host approves your request.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Host Pending Guests Section */}
        {identity?.role === "host" && identity.pendingGuests && identity.pendingGuests.length > 0 && (
          <div className="bg-midnight-card border-2 border-orange-900/40 rounded-3xl p-5 mb-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="w-10 h-10 bg-orange-900/30 text-orange-400 rounded-2xl flex items-center justify-center shadow-sm">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg leading-tight">Guests Waiting</h3>
                <p className="text-xs text-orange-200/80 font-medium uppercase tracking-wider mt-0.5">Approve to let them order</p>
              </div>
              <div className="ml-auto w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                {identity.pendingGuests.length}
              </div>
            </div>
            
            <div className="space-y-3 relative z-10">
              {identity.pendingGuests.map(guest => (
                <div key={guest.id} className="flex items-center justify-between bg-midnight-tertiary p-3.5 rounded-2xl border border-midnight-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-900/30 flex items-center justify-center text-orange-400 font-bold text-sm">
                      {guest.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[15px] text-white leading-tight">{guest.name}</p>
                      {guest.phone && <p className="text-xs text-zinc-400 font-medium mt-0.5">{guest.phone}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveGuest(guest.id, "deny")}
                      className="px-4 py-2 text-xs font-bold text-red-400 bg-red-900/20 border border-red-900/50 rounded-xl hover:bg-red-900/40 active:scale-95 transition-all"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => approveGuest(guest.id, "approve")}
                      className="px-4 py-2 text-xs font-bold text-white bg-orange-500 shadow-sm rounded-xl hover:bg-orange-600 active:scale-95 transition-all"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          groupedSections.map(({ category, dishes: sectionDishes, combos: sectionCombos }) => {
            const itemCount = category.id === "combos-category-id" ? (sectionCombos?.length || 0) : sectionDishes.length;
            return (
            <section
              key={category.id}
              ref={setSectionRef(category.id)}
              data-category-id={category.id}
              className="scroll-mt-[220px]"
            >
              <div className="w-full flex items-center gap-4 mb-6 mt-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-white tracking-widest uppercase">
                    {category.name}
                  </h2>
                  {category.name_hindi && (
                    <p className="text-xs text-[#E8A85F] font-medium mt-1 tracking-wide">{category.name_hindi}</p>
                  )}
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#E8A85F]/60 to-transparent" />
                <div className="px-3 py-1 rounded-full bg-[#E8A85F]/10 border border-[#E8A85F]/20 text-[11px] font-bold text-[#E8A85F] tracking-wider uppercase whitespace-nowrap flex-shrink-0">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </div>
              </div>

              <div className="animate-fade-in grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
            );
          })
        )}
      </div>

      <FloatingCategoryButton
        sections={groupedSections}
        activeCategoryId={activeCategoryId}
        onSelect={scrollToCategory}
        isCartVisible={cart.totalItems > 0}
      />

      {/* Bottom cart bar */}
      <button
        type="button"
        onClick={() => router.push(`/${slug}/${tableId}/cart`)}
        className={cn("cart-fab", cart.totalItems > 0 && "cart-fab--visible")}
      >
        <div className="flex items-center gap-2">
          <span className="cart-fab__icon">🛒</span>
          <span>
            {cart.totalItems} Item{cart.totalItems !== 1 ? "s" : ""} Added
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold">{formatINR(pricing.grandTotal)}</span>
          <span className="font-bold text-lg leading-none ml-1">→</span>
        </div>
      </button>

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
          tableId={tableId}
          onClose={() => setSelectedCombo(null)}
          {...comboCartHandlers(selectedCombo)}
        />
      )}

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        initialState={filterState}
        onApply={setFilterState}
        dishes={dishes}
        combos={data?.combos ?? []}
      />
    </div>
  );
}
