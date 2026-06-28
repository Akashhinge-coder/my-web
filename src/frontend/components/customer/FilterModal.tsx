"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dish, Combo } from "@/types/domain";
import { dishDataType } from "@/lib/foodType";

export type SortOption = "none" | "price_asc" | "price_desc";
export type VegPreference = "all" | "veg" | "nonveg";
export type DietaryPreference = "all" | "spicy" | "kids";

export interface FilterState {
  sortBy: SortOption;
  vegPreference: VegPreference;
  topPicks: boolean;
  dietaryPreference: DietaryPreference;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  sortBy: "none",
  vegPreference: "all",
  topPicks: false,
  dietaryPreference: "all",
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialState: FilterState;
  onApply: (state: FilterState) => void;
  dishes: Dish[];
  combos: Combo[];
}

export function FilterModal({
  isOpen,
  onClose,
  initialState,
  onApply,
  dishes,
  combos,
}: FilterModalProps) {
  const [draft, setDraft] = useState<FilterState>(initialState);

  // Sync draft state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft(initialState);
    }
  }, [isOpen, initialState]);

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Calculate results count based on draft state
  const resultsCount = useMemo(() => {
    // We only count dishes for simplicity, as combos are slightly complex to filter 
    // strictly by veg/nonveg unless we check their dish_ids, which CustomerMenuView does.
    // For a rough count, we can just filter dishes.
    let filtered = dishes.filter(d => d.is_available);

    if (draft.vegPreference !== "all") {
      filtered = filtered.filter((d) => {
        const type = dishDataType(d.food_type);
        return draft.vegPreference === "veg" ? type === "veg" : type === "nonveg";
      });
    }

    if (draft.topPicks) {
      filtered = filtered.filter((d) => d.is_special);
    }

    if (draft.dietaryPreference === "spicy") {
      filtered = filtered.filter((d) => d.spice_level > 0);
    } else if (draft.dietaryPreference === "kids") {
      filtered = filtered.filter((d) => d.spice_level === 0);
    }

    // Rough combo filtering
    let filteredCombos = combos || [];
    if (draft.vegPreference !== "all") {
      // Very basic combo filtering for the count preview
      filteredCombos = filteredCombos.filter((c) => {
        const comboDishes = (c.dish_ids ?? []).map(id => dishes.find(d => d.id === id)).filter(Boolean) as Dish[];
        const isNonVeg = comboDishes.some(d => dishDataType(d.food_type) === "nonveg");
        return draft.vegPreference === "veg" ? !isNonVeg : isNonVeg;
      });
    }

    return filtered.length + filteredCombos.length;
  }, [draft, dishes, combos]);

  if (!isOpen) return null;

  const toggleSort = (val: SortOption) => {
    setDraft(prev => ({ ...prev, sortBy: prev.sortBy === val ? "none" : val }));
  };

  const toggleVeg = (val: VegPreference) => {
    setDraft(prev => ({ ...prev, vegPreference: prev.vegPreference === val ? "all" : val }));
  };

  const toggleDietary = (val: DietaryPreference) => {
    setDraft(prev => ({ ...prev, dietaryPreference: prev.dietaryPreference === val ? "all" : val }));
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Floating Close Button */}
      <button 
        type="button"
        onClick={onClose}
        className="fixed z-[60] top-6 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#1F222B] flex items-center justify-center text-white/70 hover:text-white shadow-lg animate-fade-in"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="fixed inset-x-0 bottom-0 z-50 bg-[#1F222B] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] animate-slide-up flex flex-col max-h-[85vh]">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">Filters and Sorting</h2>
        </div>

        <div className="overflow-y-auto px-6 py-6 space-y-8 pb-28 scrollbar-hide">
          
          {/* Sort By */}
          <div>
            <h3 className="text-white font-bold mb-4">Sort by</h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => toggleSort("price_asc")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                  draft.sortBy === "price_asc"
                    ? "bg-[#E8A85F]/20 text-[#E8A85F] border-[#E8A85F]/50"
                    : "bg-[#2A2D3A] text-white/80 border-transparent hover:bg-white/10"
                )}
              >
                Price - low to high
              </button>
              <button
                type="button"
                onClick={() => toggleSort("price_desc")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                  draft.sortBy === "price_desc"
                    ? "bg-[#E8A85F]/20 text-[#E8A85F] border-[#E8A85F]/50"
                    : "bg-[#2A2D3A] text-white/80 border-transparent hover:bg-white/10"
                )}
              >
                Price - high to low
              </button>
            </div>
          </div>

          {/* Veg/Non-veg preference */}
          <div>
            <h3 className="text-white font-bold mb-4">Veg/Non-veg preference</h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => toggleVeg("veg")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border flex items-center gap-2",
                  draft.vegPreference === "veg"
                    ? "bg-green-500/10 text-green-400 border-green-500/50"
                    : "bg-[#2A2D3A] text-white/80 border-transparent hover:bg-white/10"
                )}
              >
                <div className="w-3.5 h-3.5 rounded-sm border-2 border-current flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>
                Veg
              </button>
              <button
                type="button"
                onClick={() => toggleVeg("nonveg")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border flex items-center gap-2",
                  draft.vegPreference === "nonveg"
                    ? "bg-red-500/10 text-red-400 border-red-500/50"
                    : "bg-[#2A2D3A] text-white/80 border-transparent hover:bg-white/10"
                )}
              >
                <div className="w-3.5 h-3.5 rounded-sm border-2 border-current flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>
                Non-veg
              </button>
            </div>
          </div>

          {/* Top picks */}
          <div>
            <h3 className="text-white font-bold mb-4">Top picks</h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDraft(prev => ({ ...prev, topPicks: !prev.topPicks }))}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border flex items-center gap-2",
                  draft.topPicks
                    ? "bg-[#E8A85F]/20 text-[#E8A85F] border-[#E8A85F]/50"
                    : "bg-[#2A2D3A] text-white/80 border-transparent hover:bg-white/10"
                )}
              >
                <Flame className="w-4 h-4" />
                Highly reordered
              </button>
            </div>
          </div>

          {/* Dietary preference */}
          <div>
            <h3 className="text-white font-bold mb-4">Dietary preference</h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => toggleDietary("spicy")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border flex items-center gap-2",
                  draft.dietaryPreference === "spicy"
                    ? "bg-red-500/10 text-red-400 border-red-500/50"
                    : "bg-[#2A2D3A] text-white/80 border-transparent hover:bg-white/10"
                )}
              >
                🌶️ Spicy
              </button>
              <button
                type="button"
                onClick={() => toggleDietary("kids")}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border flex items-center gap-2",
                  draft.dietaryPreference === "kids"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/50"
                    : "bg-[#2A2D3A] text-white/80 border-transparent hover:bg-white/10"
                )}
              >
                🧒 Kid's choice
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#1F222B] border-t border-white/5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_FILTER_STATE)}
            className="flex-1 py-3.5 text-center text-red-400 font-bold active:bg-white/5 rounded-xl transition-colors"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-1 py-3.5 text-center bg-[#8B8D98] text-[#1F222B] font-bold rounded-xl active:scale-95 transition-all shadow-md"
          >
            Apply ({resultsCount})
          </button>
        </div>
      </div>
    </>
  );
}
