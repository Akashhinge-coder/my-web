"use client";

import Image from "next/image";
import { Search, X } from "lucide-react";
import { FoodTypeFilter } from "./FoodTypeFilter";
import { CategoryNav } from "./CategoryNav";
import type { Category } from "@/types/domain";
import { isValidImageSrc } from "@/lib/utils";

interface MenuStickyNavProps {
  restaurantName: string;
  tableNumber: string;
  logoUrl: string | null;
  categories: Category[];
  activeCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  showSearch: boolean;
  onToggleSearch: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function MenuStickyNav({
  restaurantName,
  tableNumber,
  logoUrl,
  categories,
  activeCategoryId,
  onCategorySelect,
  showSearch,
  onToggleSearch,
  search,
  onSearchChange,
}: MenuStickyNavProps) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/10 shadow-lg">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isValidImageSrc(logoUrl) ? (
            <Image
              src={logoUrl!}
              alt={`${restaurantName} logo`}
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
            >
              {restaurantName?.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate">
              {restaurantName}
            </p>
            <p className="text-xs text-white/60">Table {tableNumber}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleSearch}
          className="p-2.5 rounded-xl text-white/70 hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Search menu"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {showSearch && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              autoFocus
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 py-2.5 text-sm rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand/50"
              placeholder="Search dishes..."
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-4 pb-3">
        <FoodTypeFilter />
      </div>

      <div className="px-4 pb-3">
        <CategoryNav
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelect={onCategorySelect}
        />
      </div>
    </div>
  );
}
