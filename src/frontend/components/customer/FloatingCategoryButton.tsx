"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Menu } from "lucide-react";
import type { Category } from "@/types/domain";

interface GroupedSection {
  category: Category;
  dishes: any[];
  combos: any[];
}

interface FloatingCategoryButtonProps {
  sections: GroupedSection[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string) => void;
  isCartVisible: boolean;
}

export function FloatingCategoryButton({
  sections,
  activeCategoryId,
  onSelect,
  isCartVisible,
}: FloatingCategoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Prevent background scrolling when open
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

  // activeSection is no longer used for the label, but we keep it if we need it later.

  return (
    <>
      {/* Floating Button / Close Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full font-bold transition-all duration-300 active:scale-95",
          isOpen
            ? "bg-[#252836] text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)]" 
            : "text-[#0a0e17]",
          isCartVisible ? "bottom-[110px]" : "bottom-[90px]"
        )}
        style={
          isOpen 
            ? undefined 
            : {
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
              }
        }
      >
        {isOpen ? (
          <>
            <X className="w-5 h-5" />
            <span className="text-[15px]">Close</span>
          </>
        ) : (
          <>
            <Menu className="w-5 h-5" />
            <span className="text-[15px] max-w-[120px] truncate">Menu</span>
          </>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Menu Card (KFC Style) */}
      <div
        className={cn(
          "fixed z-50 bg-[#1F222B] rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out flex flex-col right-4 left-4 sm:left-auto sm:w-[360px]",
          isOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 translate-y-4 pointer-events-none",
          isCartVisible ? "bottom-[170px]" : "bottom-[150px]"
        )}
        style={{ maxHeight: "65vh" }}
      >
        <div className="overflow-y-auto px-2 py-4 scrollbar-hide">
          {sections.map((section) => {
            const count = section.dishes.length + section.combos.length;
            if (count === 0) return null;
            
            const isActive = activeCategoryId === section.category.id;

            return (
              <button
                key={section.category.id}
                type="button"
                onClick={() => {
                  onSelect(section.category.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-6 py-4 transition-colors active:bg-white/5 rounded-2xl",
                  isActive ? "text-[#E8A85F]" : "text-white/90"
                )}
              >
                <span className={cn(
                  "text-[17px] text-left",
                  isActive ? "font-bold" : "font-medium"
                )}>
                  {section.category.name}
                </span>
                <span className={cn(
                  "text-[16px]",
                  isActive ? "font-bold" : "font-medium"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
