"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Flame, Sparkles, Plus, Minus } from "lucide-react";
import { formatINR, cn, isValidImageSrc } from "@/lib/utils";
import { dishDataType } from "@/lib/foodType";
import type { Dish } from "@/types/domain";

const FOOD_TYPE_STYLES: Record<string, string> = {
  veg: "border-green-600",
  non_veg: "border-red-600",
  vegan: "border-emerald-600",
  jain: "border-amber-600",
};

interface DishCardProps {
  dish: Dish;
  onInfo: () => void;
  slug: string;
  tableId: string;
}

export function DishCard({ dish, onInfo, slug, tableId }: DishCardProps) {
  const router = useRouter();
  const hasAR = (
    dish as unknown as { dish_ar_assets?: { is_published: boolean }[] }
  ).dish_ar_assets?.[0]?.is_published;
  const borderColor = FOOD_TYPE_STYLES[dish.food_type] || "border-green-600";
  const dataType = dishDataType(dish.food_type);

  return (
    <div
      className="dish-card-wrapper dish-filter-transition bg-white rounded-2xl border border-border shadow-card overflow-hidden flex gap-0"
      data-dish-type={dataType}
      data-cart-card-id={dish.id}
    >
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

          <h3 className="font-semibold text-ink text-sm leading-tight mb-1">
            {dish.name}
          </h3>

          {dish.description && (
            <p className="text-xs text-ink-3 line-clamp-2 mb-2 leading-relaxed">
              {dish.description}
            </p>
          )}

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

          <button
            type="button"
            className="js-cart-add w-20 flex items-center justify-center gap-1 py-1.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 min-h-[44px]"
            style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
            data-cart-id={dish.id}
            data-cart-name={dish.name}
            data-cart-price={String(dish.price)}
            data-cart-image={dish.image_url || ""}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>

          <div className="js-cart-qty hidden w-20 flex items-center justify-between px-2 py-1 rounded-xl border-2 border-brand min-h-[44px]">
            <button
              type="button"
              className="js-cart-dec text-brand p-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
              data-cart-id={dish.id}
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="js-cart-qty-value font-bold text-brand text-sm">
              0
            </span>
            <button
              type="button"
              className="js-cart-inc text-brand p-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
              data-cart-id={dish.id}
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
