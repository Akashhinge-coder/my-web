"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "veg", label: "Veg Only" },
  { value: "nonveg", label: "Non-Veg Only" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export function FoodTypeFilter() {
  const [active, setActive] = useState<FilterValue>("all");

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>("[data-dish-type]");
    cards.forEach((card) => {
      const type = card.getAttribute("data-dish-type");
      const show = active === "all" || type === active;
      card.classList.toggle("dish-filter-hidden", !show);
    });
  }, [active]);

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      role="group"
      aria-label="Food type filter"
    >
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => setActive(f.value)}
          className={cn(
            "snap-start px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border min-h-[44px]",
            active === f.value
              ? "border-white/30 bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]"
              : "border-white/10 text-white/70 hover:border-white/20 hover:text-white"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
