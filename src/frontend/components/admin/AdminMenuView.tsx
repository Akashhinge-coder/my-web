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
          <h1 className="page-title text-white">Menu &amp; Dishes</h1>
          <p className="page-subtitle">
            {dishes.length} dishes · {availableCount} available · {categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="btn-md btn-dark mt-1"
          >
            <Plus className="w-4 h-4" />
            Category
          </button>
          <button type="button" onClick={openAddDish} className="btn-md btn-primary mt-1">
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
          <input
            className="input-dark pl-10"
            placeholder="Search dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-white"
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
            "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
            categoryFilter === "all"
              ? "bg-brand text-white"
              : "bg-dark-card border border-dark-border text-ink-3 hover:text-white"
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
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              categoryFilter === cat.id
                ? "bg-brand text-white"
                : "bg-dark-card border border-dark-border text-ink-3 hover:text-white"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-dark overflow-hidden">
              <div className="shimmer h-36" />
              <div className="p-4 space-y-2">
                <div className="shimmer h-4 rounded w-2/3" />
                <div className="shimmer h-3 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="text-center py-20">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 text-ink-4 opacity-40" />
          <p className="text-ink-3 font-medium">No dishes found</p>
          <p className="text-xs text-ink-4 mt-1">
            {dishes.length === 0 ? "Add your first dish to get started" : "Try a different search or category"}
          </p>
          {dishes.length === 0 && (
            <button type="button" onClick={openAddDish} className="btn-md btn-primary mt-4 inline-flex">
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
                  "card-dark overflow-hidden flex flex-col transition-all",
                  !dish.is_available && "opacity-60"
                )}
              >
                <div className="relative h-36 bg-dark-tertiary">
                  {dish.image_url ? (
                    <img
                      src={dish.image_url}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-4">
                      <UtensilsCrossed className="w-10 h-10 opacity-30" />
                    </div>
                  )}

                  {!dish.is_available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/90 bg-red-500/80 px-3 py-1 rounded-full">
                        Sold out
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    <div
                      className={cn(
                        "w-4 h-4 rounded-sm border-2 bg-dark-primary/80 flex items-center justify-center",
                        border
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand/90 text-white font-semibold">
                        Special
                      </span>
                    )}
                    {hasAr && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-500/90 text-white font-semibold flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" />
                        AR
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 gap-3">
                  <div>
                    <p className="font-semibold text-white leading-snug">{dish.name}</p>
                    {dish.name_hindi && (
                      <p className="text-xs text-ink-4 mt-0.5">{dish.name_hindi}</p>
                    )}
                    <p className="text-xs text-ink-4 mt-1">{categoryName(dish, categories)}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-bold text-brand text-lg">{formatINR(dish.price)}</p>
                    {dish.spice_level > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: Math.min(dish.spice_level, 3) }).map((_, i) => (
                          <Flame key={i} className="w-3 h-3 text-orange-500" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-dark-border">
                    <button
                      type="button"
                      onClick={() => openEditDish(dish)}
                      disabled={busy}
                      className="flex-1 btn-md btn-dark py-2 text-xs"
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
                        "flex-1 btn-md py-2 text-xs",
                        dish.is_available ? "btn-dark" : "bg-green-500/10 border border-green-500/30 text-green-400"
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
                      className="p-2 rounded-xl text-ink-4 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
          <div className="card-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 border-brand/30">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white text-lg">
                {modalMode === "add" ? "Add Dish" : "Edit Dish"}
              </h3>
              <button
                type="button"
                onClick={closeDishModal}
                className="p-2 rounded-xl text-ink-4 hover:text-white hover:bg-dark-tertiary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label text-ink-3">Name (English)</label>
                <input
                  className="input-dark"
                  value={form.name}
                  onChange={handleEnglishNameChange}
                />
              </div>
              <div>
                <label className="label text-ink-3">Name (Hindi)</label>
                <input
                  className="input-dark"
                  value={form.name_hindi}
                  onChange={(e) => setForm((p) => ({ ...p, name_hindi: e.target.value }))}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="label text-ink-3">Description</label>
              <textarea
                className="input-dark min-h-[80px] resize-y"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label text-ink-3">Price (₹)</label>
                <input
                  className="input-dark"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="label text-ink-3">Category</label>
                <select
                  className="input-dark"
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
                <label className="label text-ink-3">Size</label>
                <div className="flex gap-2">
                  {DISH_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, dish_size: size }))}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        form.dish_size === size
                          ? "bg-brand/10 border-brand/30 text-brand"
                          : "border-dark-border text-ink-4"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="label text-ink-3">Food type</label>
              <div className="flex flex-wrap gap-2">
                {FOOD_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, food_type: ft.value }))}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                      form.food_type === ft.value
                        ? "bg-brand/10 border-brand/30 text-brand"
                        : "border-dark-border text-ink-4"
                    )}
                  >
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label text-ink-3">Spice level ({form.spice_level})</label>
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
              <label className="label text-ink-3">Dish Image</label>

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
                <div className="relative rounded-xl overflow-hidden border border-dark-border group">
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
                  className="w-full h-36 rounded-xl border-2 border-dashed border-dark-border hover:border-brand/50 bg-dark-tertiary/40 hover:bg-brand/5 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-7 h-7 text-brand animate-spin" />
                  ) : (
                    <ImageUp className="w-7 h-7 text-ink-4 group-hover:text-brand transition-colors" />
                  )}
                  <span className="text-xs text-ink-4 group-hover:text-ink-3 transition-colors">
                    {uploadingImage ? "Uploading…" : "Click to select image from your device"}
                  </span>
                  <span className="text-[10px] text-ink-4/60">PNG, JPEG, WebP or GIF · Max 5 MB</span>
                </button>
              )}
            </div>

            <div className="mb-4">
              <label className="label text-ink-3">Allergy tags</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleAllergy(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all",
                      form.allergy_tags.includes(tag)
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "border-dark-border text-ink-4"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <label className="flex items-center gap-2 text-sm text-ink-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm((p) => ({ ...p, is_available: e.target.checked }))}
                  className="rounded border-dark-border"
                />
                Available on menu
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_special}
                  onChange={(e) => setForm((p) => ({ ...p, is_special: e.target.checked }))}
                  className="rounded border-dark-border"
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
              <button type="button" onClick={closeDishModal} className="btn-md btn-dark flex-1">
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveDish()}
                disabled={
                  saving || !form.name.trim() || !form.price || !form.category_id
                }
                className="btn-md btn-primary flex-1"
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
          <div className="card-dark w-full max-w-md p-6 border-brand/30">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Add Category</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryNameInput("");
                }}
                className="p-2 rounded-xl text-ink-4 hover:text-white hover:bg-dark-tertiary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-5">
              <label className="label text-ink-3">Category name</label>
              <input
                className="input-dark"
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
                className="btn-md btn-dark flex-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void addCategory()}
                disabled={savingCategory || !categoryNameInput.trim()}
                className="btn-md btn-primary flex-1"
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
