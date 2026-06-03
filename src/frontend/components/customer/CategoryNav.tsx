"use client";

import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string) => void;
}

export function CategoryNav({
  categories,
  activeCategoryId,
  onSelect,
}: CategoryNavProps) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-0.5">
      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              "relative snap-start px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-h-[44px]",
              isActive ? "text-white" : "text-white/60 hover:text-white/90"
            )}
          >
            {isActive && (
              <span
                className="absolute inset-0 rounded-xl bg-white/15 border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.12)]"
              />
            )}
            <span className="relative z-10">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
