"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import { formatINR, isValidImageSrc } from "@/lib/utils";
import type { Dish } from "@/types/domain";

interface DishModalProps {
  dish: Dish;
  onClose: () => void;
  slug: string;
  tableId: string;
}

export function DishModal({ dish, onClose, slug, tableId }: DishModalProps) {
  const router = useRouter();
  const hasAR = (
    dish as unknown as { dish_ar_assets?: { is_published: boolean }[] }
  ).dish_ar_assets?.[0]?.is_published;

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
            className="h-32 flex items-center justify-center text-5xl bg-surface-secondary"
          >
            🍽
          </div>
        )}

        <div className="p-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/90 backdrop-blur-sm text-ink-3 hover:text-ink shadow-card"
          >
            <X className="w-4 h-4" />
          </button>

          <h2 className="font-display text-2xl font-semibold text-ink mb-1">
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

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="font-display text-2xl font-semibold text-ink">
              {formatINR(dish.price)}
            </span>
            <button
              type="button"
              className="js-cart-add px-6 py-3 rounded-xl text-white font-semibold text-sm min-h-[44px]"
              style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
              data-cart-id={dish.id}
              data-cart-name={dish.name}
              data-cart-price={String(dish.price)}
              data-cart-image={dish.image_url || ""}
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
