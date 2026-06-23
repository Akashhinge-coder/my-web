"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Flame,
  Search,
  X,
  Check,
  Loader2,
  UtensilsCrossed,
  ImageUp,
  Trash,
} from "lucide-react";
import { menuApi, toCreateDishDto } from "@/frontend/api/menu";
import { useAdminMenu } from "@/frontend/hooks/useMenu";
import { useAdminRestaurant } from "@/frontend/hooks/useAdminRestaurant";
import { cn, formatINR } from "@/lib/utils";
import type { Category, Dish, FoodType } from "@/types/domain";
import { dishHasPublishedAr, type AdminDish } from "@/types/menu";

const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-Veg" },
  { value: "vegan", label: "Vegan" },
  { value: "jain", label: "Jain" },
];

const ALLERGY_TAGS = ["gluten", "nuts", "dairy", "eggs", "shellfish"] as const;

const DISH_SIZES = ["S", "M", "L"] as const;

const FOOD_BORDER: Record<FoodType, string> = {
  veg: "border-green-600",
  non_veg: "border-red-600",
  vegan: "border-emerald-600",
  jain: "border-amber-600",
};

type DishForm = {
  name: string;
  name_hindi: string;
  description: string;
  price: string;
  category_id: string;
  food_type: FoodType;
  spice_level: number;
  is_available: boolean;
  is_special: boolean;
  allergy_tags: string[];
  dish_size: (typeof DISH_SIZES)[number];
  image_url: string;
};

const EMPTY_DISH: DishForm = {
  name: "",
  name_hindi: "",
  description: "",
  price: "",
  category_id: "",
  food_type: "veg",
  spice_level: 2,
  is_available: true,
  is_special: false,
  allergy_tags: [],
  dish_size: "M",
  image_url: "",
};

type ModalMode = "add" | "edit";

function dishToForm(dish: AdminDish): DishForm {
  return {
    name: dish.name,
    name_hindi: dish.name_hindi ?? "",
    description: dish.description ?? "",
    price: String(dish.price),
    category_id: dish.category_id,
    food_type: dish.food_type,
    spice_level: dish.spice_level,
    is_available: dish.is_available,
    is_special: dish.is_special,
    allergy_tags: dish.allergy_tags ?? [],
    dish_size: dish.dish_size,
    image_url: dish.image_url ?? "",
  };
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

function categoryName(dish: AdminDish, categories: Category[]): string {
  return dish.categories?.name ?? categories.find((c) => c.id === dish.category_id)?.name ?? "—";
}

export default function AdminMenuView() {
  const { restaurantId, loading: restaurantLoading } = useAdminRestaurant();
  const { data, loading, error, refresh } = useAdminMenu(restaurantId);

  const categories: Category[] = data?.categories ?? [];
  const dishes = (data?.dishes ?? []) as AdminDish[];

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [form, setForm] = useState<DishForm>({ ...EMPTY_DISH });
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [customAllergyInput, setCustomAllergyInput] = useState("");

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      if (categoryFilter !== "all" && dish.category_id !== categoryFilter) return false;
      return matchesSearch(dish, search);
    });
  }, [dishes, categoryFilter, search]);

  const isLoading = restaurantLoading || loading;

  function openAddDish() {
    const defaultCategory = categories[0]?.id ?? "";
    setForm({ ...EMPTY_DISH, category_id: defaultCategory });
    setEditingDishId(null);
    setImagePreview(null);
    setModalMode("add");
  }

  function openEditDish(dish: AdminDish) {
    setForm(dishToForm(dish));
    setEditingDishId(dish.id);
    setImagePreview(dish.image_url ?? null);
    setModalMode("edit");
  }

  function closeDishModal() {
    setModalMode(null);
    setEditingDishId(null);
    setForm({ ...EMPTY_DISH });
    setImagePreview(null);
  }

  async function uploadDishImage(file: File) {
    if (!restaurantId) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/v1/menu/dishes/image?restaurantId=${restaurantId}`,
        { method: "POST", body: fd }
      );
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Upload failed");
      }
      const data = (await res.json()) as { imageUrl: string };
      setForm((p) => ({ ...p, image_url: data.imageUrl }));
      setImagePreview(data.imageUrl);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Local preview while uploading
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    void uploadDishImage(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function removeImage() {
    setForm((p) => ({ ...p, image_url: "" }));
    setImagePreview(null);
  }

  function toggleAllergy(tag: string) {
    setForm((prev) => ({
      ...prev,
      allergy_tags: prev.allergy_tags.includes(tag)
        ? prev.allergy_tags.filter((t) => t !== tag)
        : [...prev.allergy_tags, tag],
    }));
  }

  function addCustomAllergy() {
    const tag = customAllergyInput.trim().toLowerCase();
    if (!tag) return;
    if (!form.allergy_tags.includes(tag)) {
      setForm((prev) => ({ ...prev, allergy_tags: [...prev.allergy_tags, tag] }));
    }
    setCustomAllergyInput("");
  }

  async function saveDish() {
    if (!restaurantId || !form.name.trim() || !form.price || !form.category_id) return;
    const price = parseFloat(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      alert("Enter a valid price.");
      return;
    }

    setSaving(true);
    try {
      const dto = toCreateDishDto(form);
      if (modalMode === "edit" && editingDishId) {
        await menuApi.updateDish(restaurantId, editingDishId, dto);
      } else {
        await menuApi.createDish(restaurantId, dto);
      }
      closeDishModal();
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to save dish. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(dish: AdminDish) {
    if (!restaurantId) return;
    setActionId(dish.id);
    try {
      await menuApi.toggleDishAvailability(restaurantId, dish.id, !dish.is_available);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to update availability.");
    } finally {
      setActionId(null);
    }
  }

  async function deleteDish(dishId: string, dishName: string) {
    if (!restaurantId) return;
    if (!confirm(`Delete "${dishName}"? This cannot be undone.`)) return;
    setActionId(dishId);
    try {
      await menuApi.deleteDish(restaurantId, dishId);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to delete dish.");
    } finally {
      setActionId(null);
    }
  }

  async function addCategory() {
    if (!restaurantId || !categoryNameInput.trim()) return;
    setSavingCategory(true);
    try {
      await menuApi.createCategory(restaurantId, { name: categoryNameInput.trim() });
      setCategoryNameInput("");
      setShowCategoryModal(false);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to create category.");
    } finally {
      setSavingCategory(false);
    }
  }

  const availableCount = dishes.filter((d) => d.is_available).length;

  const handleEnglishNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setForm((p) => ({ ...p, name: newName }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (newName.trim()) {
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/v1/transliterate?text=${encodeURIComponent(newName)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.result) {
              setForm((p) => ({ ...p, name_hindi: data.result }));
            }
          }
        } catch (error) {
          console.error("Transliteration error:", error);
        }
      }, 500);
    } else {
      setForm((p) => ({ ...p, name_hindi: "" }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="page-header mb-0">
          <h1 className="page-title text-foreground">Menu &amp; Dishes</h1>
          <p className="page-subtitle text-muted-foreground">
            {dishes.length} dishes · {availableCount} available · {categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="btn-md btn-admin mt-1"
          >
            <Plus className="w-4 h-4" />
            Category
          </button>
          <button type="button" onClick={openAddDish} className="btn-md btn-accent mt-1">
            <Plus className="w-4 h-4" />
            Add Dish
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="input-admin pl-10"
            placeholder="Search dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 border",
            categoryFilter === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
              : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          )}
        >
          All ({dishes.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 border",
              categoryFilter === cat.id
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-admin overflow-hidden">
              <div className="animate-pulse h-36 bg-muted/20" />
              <div className="p-4 space-y-2">
                <div className="animate-pulse h-4 rounded w-2/3 bg-muted/20" />
                <div className="animate-pulse h-3 rounded w-1/2 bg-muted/20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="text-center py-20">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="font-medium text-muted-foreground">No dishes found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {dishes.length === 0 ? "Add your first dish to get started" : "Try a different search or category"}
          </p>
          {dishes.length === 0 && (
            <button type="button" onClick={openAddDish} className="btn-md btn-accent mt-4 inline-flex">
              <Plus className="w-4 h-4" />
              Add Dish
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDishes.map((dish) => {
            const border = FOOD_BORDER[dish.food_type] ?? "border-green-600";
            const busy = actionId === dish.id;
            const hasAr = dishHasPublishedAr(dish);

            return (
              <div
                key={dish.id}
                className={cn(
                  "card-admin overflow-hidden flex flex-col transition-all group hover:border-accent-cyan/30",
                  !dish.is_available && "opacity-60"
                )}
              >
                <div className="relative h-36 bg-muted">
                  {dish.image_url ? (
                    <img
                      src={dish.image_url}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <UtensilsCrossed className="w-10 h-10 opacity-30" />
                    </div>
                  )}

                  {!dish.is_available && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white bg-destructive/80 px-4 py-1.5 rounded-full shadow-lg">
                        Sold out
                      </span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <div
                      className={cn(
                        "w-4 h-4 rounded-sm border-2 bg-background/80 flex items-center justify-center",
                        border
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          dish.food_type === "non_veg"
                            ? "bg-destructive"
                            : dish.food_type === "vegan"
                              ? "bg-emerald-600"
                              : dish.food_type === "jain"
                                ? "bg-amber-600"
                                : "bg-emerald-500"
                        )}
                      />
                    </div>
                    {dish.is_special && (
                      <span className="text-[9px] px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-black uppercase tracking-tighter shadow-lg shadow-primary/20">
                        Special
                      </span>
                    )}
                    {hasAr && (
                      <span className="text-[9px] px-2 py-0.5 rounded-md bg-chart-5/90 text-white font-black flex items-center gap-0.5 uppercase tracking-tighter shadow-lg shadow-chart-5/20">
                        <Flame className="w-2.5 h-2.5 fill-white" />
                        AR
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1 gap-4">
                  <div>
                    <p className="font-bold text-foreground leading-tight text-base mb-1">{dish.name}</p>
                    <div className="flex items-center justify-between">
                      {dish.name_hindi && (
                        <p className="text-xs text-muted-foreground font-medium">{dish.name_hindi}</p>
                      )}
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{categoryName(dish, categories)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-black text-primary text-xl tracking-tight">{formatINR(dish.price)}</p>
                    {dish.spice_level > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: Math.min(dish.spice_level, 3) }).map((_, i) => (
                          <Flame key={i} className="w-3.5 h-3.5 text-chart-5 fill-chart-5/20" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => openEditDish(dish)}
                      disabled={busy}
                      className="flex-1 btn-sm btn-admin py-2.5 text-xs font-bold bg-muted/40 border-border hover:border-primary hover:text-primary transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleAvailable(dish)}
                      disabled={busy}
                      title={dish.is_available ? "Mark sold out" : "Mark available"}
                      className={cn(
                        "flex-1 btn-sm py-2.5 text-xs font-bold transition-all",
                        dish.is_available
                          ? "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                          : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      )}
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : dish.is_available ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Sold out
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Available
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteDish(dish.id, dish.name)}
                      disabled={busy}
                      className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 border-primary/20">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground text-lg">
                {modalMode === "add" ? "Add Dish" : "Edit Dish"}
              </h3>
              <button
                type="button"
                onClick={closeDishModal}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Name (English)</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={handleEnglishNameChange}
                />
              </div>
              <div>
                <label className="label">Name (Hindi)</label>
                <input
                  className="input"
                  value={form.name_hindi}
                  onChange={(e) => setForm((p) => ({ ...p, name_hindi: e.target.value }))}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Description</label>
              <textarea
                className="input min-h-[80px] resize-y"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Price (₹)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={form.category_id}
                  onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Size</label>
                <div className="flex gap-2">
                  {DISH_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, dish_size: size }))}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        form.dish_size === size
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="label text-slate-400">Food type</label>
              <div className="flex flex-wrap gap-2">
                {FOOD_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, food_type: ft.value }))}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                      form.food_type === ft.value
                        ? "btn-accent"
                        : "border-admin-border-2 text-slate-500"
                    )}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label text-slate-400">Spice level ({form.spice_level})</label>
              <input
                className="w-full accent-brand"
                type="range"
                min={0}
                max={5}
                value={form.spice_level}
                onChange={(e) =>
                  setForm((p) => ({ ...p, spice_level: parseInt(e.target.value, 10) }))
                }
              />
            </div>

            {/* ── Dish Image Upload ── */}
            <div className="mb-4">
              <label className="label text-slate-400">Dish Image</label>

              {/* Hidden real file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleImageFileChange}
              />

              {imagePreview ? (
                /* Preview state */
                <div className="relative rounded-xl overflow-hidden border border-admin-border-2 group">
                  <img
                    src={imagePreview}
                    alt="Dish preview"
                    className="w-full h-44 object-cover"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 text-white animate-spin" />
                      <span className="ml-2 text-white text-sm font-medium">Uploading…</span>
                    </div>
                  )}
                  {!uploadingImage && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium hover:bg-white/20 transition-all"
                      >
                        <ImageUp className="w-3.5 h-3.5" />
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Upload drop zone */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full h-36 rounded-xl border-2 border-dashed border-admin-border-2 hover:border-accent-cyan/50 bg-admin-card-2 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-7 h-7 text-accent-cyan animate-spin" />
                  ) : (
                    <ImageUp className="w-7 h-7 text-slate-500 group-hover:text-accent-cyan transition-colors" />
                  )}
                  <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                    {uploadingImage ? "Uploading…" : "Click to select image from your device"}
                  </span>
                  <span className="text-[10px] text-slate-600">PNG, JPEG, WebP or GIF · Max 5 MB</span>
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="label text-slate-400">Allergy tags</label>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set([...ALLERGY_TAGS, ...form.allergy_tags])).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleAllergy(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all",
                        form.allergy_tags.includes(tag)
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "border-admin-border-2 text-slate-500"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Custom allergy..."
                    className="input-admin text-xs py-2 px-3 h-auto w-40"
                    value={customAllergyInput}
                    onChange={(e) => setCustomAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomAllergy();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomAllergy}
                    disabled={!customAllergyInput.trim()}
                    className="btn-md btn-admin py-2 px-3 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm((p) => ({ ...p, is_available: e.target.checked }))}
                  className="rounded border-admin-border-2 accent-accent-cyan"
                />
                Available on menu
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_special}
                  onChange={(e) => setForm((p) => ({ ...p, is_special: e.target.checked }))}
                  className="rounded border-admin-border-2 accent-accent-cyan"
                />
                Chef&apos;s special
              </label>
            </div>

            {modalMode === "edit" && editingDishId && (
              <p className="text-xs text-ink-4 mb-4">
                <Link href="/admin/menu/ar" className="text-brand hover:underline">
                  AR Setup
                </Link>
                {" — manage 3D views for this dish"}
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={closeDishModal} className="btn-md btn-admin flex-1">
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveDish()}
                disabled={
                  saving || !form.name.trim() || !form.price || !form.category_id
                }
                className="btn-md btn-accent flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {modalMode === "add" ? "Create Dish" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card-admin w-full max-w-md p-6 border-accent-cyan/30">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Add Category</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryNameInput("");
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-admin-card-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-5">
              <label className="label text-slate-400">Category name</label>
              <input
                className="input-admin"
                placeholder="e.g. Starters"
                value={categoryNameInput}
                onChange={(e) => setCategoryNameInput(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryNameInput("");
                }}
                className="btn-md btn-admin flex-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void addCategory()}
                disabled={savingCategory || !categoryNameInput.trim()}
                className="btn-md btn-accent flex-1"
              >
                {savingCategory ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
