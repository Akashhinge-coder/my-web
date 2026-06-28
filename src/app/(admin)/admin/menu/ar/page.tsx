"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { menuApi } from "@/frontend/api/menu";
import { restaurantsApi } from "@/frontend/api/restaurants";
import { cn } from "@/lib/utils";
import {
  Upload, Check, ChevronRight,
  AlertCircle, Sparkles, RotateCcw, ArrowLeft,
} from "lucide-react";
import type { DishARAsset, FoodType } from "@/types/domain";
import type { UpsertArAssetDTO } from "@/types/menu-dto";

const ANGLES = [
  { key: "angle_front", label: "Front",  desc: "Straight-on view of the dish",    emoji: "⬤" },
  { key: "angle_back",  label: "Back",   desc: "Rear view of the dish",            emoji: "◯" },
  { key: "angle_left",  label: "Left",   desc: "Left side of the dish",            emoji: "◁" },
  { key: "angle_right", label: "Right",  desc: "Right side of the dish",           emoji: "▷" },
  { key: "angle_top",   label: "Top",    desc: "Bird's eye / overhead view",       emoji: "▽" },
] as const;

type AngleKey = (typeof ANGLES)[number]["key"];

interface ARAssetDraft {
  id?: string;
  angle_front:  string | null;
  angle_back:   string | null;
  angle_left:   string | null;
  angle_right:  string | null;
  angle_top:    string | null;
  is_published: boolean;
}

interface DishOption {
  id: string;
  name: string;
  image_url: string | null;
  food_type: FoodType;
}

function emptyArAsset(): ARAssetDraft {
  return {
    angle_front: null,
    angle_back: null,
    angle_left: null,
    angle_right: null,
    angle_top: null,
    is_published: false,
  };
}

function toArAssetDto(asset: ARAssetDraft, publish: boolean): UpsertArAssetDTO {
  return {
    angleFront: asset.angle_front,
    angleBack: asset.angle_back,
    angleLeft: asset.angle_left,
    angleRight: asset.angle_right,
    angleTop: asset.angle_top,
    isPublished: publish,
  };
}

function toArAssetDraft(asset: DishARAsset | null): ARAssetDraft {
  if (!asset) return emptyArAsset();
  return {
    id: asset.id,
    angle_front: asset.angle_front,
    angle_back: asset.angle_back,
    angle_left: asset.angle_left,
    angle_right: asset.angle_right,
    angle_top: asset.angle_top,
    is_published: asset.is_published,
  };
}

export default function ARPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [dishes,       setDishes]       = useState<DishOption[]>([]);
  const [selectedDish, setSelectedDish] = useState<DishOption | null>(null);
  const [arAsset,      setARAsset]      = useState<ARAssetDraft | null>(null);
  const [uploading,    setUploading]    = useState<AngleKey | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [preview,      setPreview]      = useState<AngleKey>("angle_front");
  const [loading,      setLoading]      = useState(true);

  // ── Init ─────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const rest = await restaurantsApi.getContext();
      setRestaurantId(rest.id);
    }
    void init();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    menuApi
      .listDishes(restaurantId, { admin: true })
      .then((data) => {
        setDishes(data.map((dish) => ({
          id: dish.id,
          name: dish.name,
          image_url: dish.image_url,
          food_type: dish.food_type,
        })));
        setLoading(false);
      })
      .catch(() => {
        setDishes([]);
        setLoading(false);
      });
  }, [restaurantId]);

  // ── Load AR asset for selected dish ──────────────────────
  const loadARAsset = useCallback(async (dishId: string) => {
    if (!restaurantId) return;
    const data = await menuApi.getDishAr(restaurantId, dishId);
    setARAsset(toArAssetDraft(data.arAsset));
  }, [restaurantId]);

  useEffect(() => {
    if (selectedDish) loadARAsset(selectedDish.id);
  }, [selectedDish, loadARAsset]);

  // ── Handle image URL input per angle ─────────────────────
  function setAngleUrl(key: AngleKey, url: string) {
    setARAsset(p => p ? { ...p, [key]: url || null } : p);
  }

  // ── Count uploaded angles ─────────────────────────────────
  const uploadedCount = arAsset
    ? ANGLES.filter(a => arAsset[a.key]).length
    : 0;

  const allUploaded = uploadedCount === 5;

  // ── Save AR asset ─────────────────────────────────────────
  async function saveAsset(publish: boolean) {
    if (!selectedDish || !arAsset || !restaurantId) return;
    setSaving(true);

    await menuApi.upsertDishAr(restaurantId, selectedDish.id, toArAssetDto(arAsset, publish));

    await loadARAsset(selectedDish.id);
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        {selectedDish && (
          <button
            onClick={() => setSelectedDish(null)}
            className="mt-1 p-2 rounded-xl text-admin-muted hover:text-admin-text hover:bg-admin-card-2 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="page-title text-admin-text flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent-cyan" />
            AR Setup
          </h1>
          <p className="page-subtitle text-admin-muted">
            Upload 5 photos per dish to enable AR visualization for customers
          </p>
        </div>
      </div>

      {/* How it works */}
      {!selectedDish && (
        <div className="card-admin p-5 border-accent-cyan/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-accent-cyan" />
            </div>
            <div>
              <p className="text-sm font-medium text-admin-text mb-1">How AR works</p>
              <p className="text-xs text-admin-muted leading-relaxed">
                Upload 5 photos of each dish from different angles — Front, Back, Left, Right, Top.
                Once all 5 are uploaded and published, customers can tap "View in AR" on your menu
                and see the dish appear on their actual table through the camera.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dish selector */}
      {!selectedDish ? (
        <div>
          <p className="section-label text-admin-subtle mb-3">Select a dish to set up AR</p>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="card-admin p-4 space-y-2">
                  <div className="animate-pulse h-20 rounded-lg w-full bg-admin-card-2" />
                  <div className="animate-pulse h-3 rounded w-3/4 bg-admin-card-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {dishes.map(dish => (
                <button
                  key={dish.id}
                  onClick={() => setSelectedDish(dish)}
                  className="card-admin p-3 text-left hover:border-accent-cyan/40 transition-all group"
                >
                  {/* Dish image */}
                  <div className="h-20 bg-admin-card-2 border border-admin-border-2 rounded-lg overflow-hidden mb-3 relative">
                    {dish.image_url ? (
                      <Image src={dish.image_url} alt={dish.name || ""} fill unoptimized
                        className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-admin-text truncate flex-1">{dish.name}</p>
                    <ChevronRight className="w-4 h-4 text-admin-subtle group-hover:text-accent-cyan transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── AR Editor ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Angle uploads */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-admin-text">{selectedDish.name}</p>
              <span className={cn(
                "text-xs px-2.5 py-1 rounded-full border font-medium",
                allUploaded
                  ? "bg-[#34d399]/20 border-[#34d399]/30 text-[#34d399]"
                  : "bg-[#facc15]/20 border-[#facc15]/30 text-[#facc15]"
              )}>
                {uploadedCount}/5 angles
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-admin-card-2 border border-admin-border-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-cyan rounded-full transition-all duration-500"
                style={{ width: `${(uploadedCount / 5) * 100}%` }}
              />
            </div>

            {/* Angle slots */}
            <div className="space-y-3">
              {ANGLES.map(angle => {
                const url = arAsset?.[angle.key];
                const isActive = preview === angle.key;

                return (
                  <div
                    key={angle.key}
                    className={cn(
                      "card-admin p-4 cursor-pointer transition-all",
                      isActive && "border-accent-cyan/40",
                      url && "border-[#34d399]/20"
                    )}
                    onClick={() => setPreview(angle.key)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Angle indicator */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border",
                        url
                          ? "bg-[#34d399]/10 border-[#34d399]/30"
                          : "bg-admin-card-2 border-admin-border-2"
                      )}>
                        {url ? <Check className="w-5 h-5 text-[#34d399]" /> : angle.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-admin-text">{angle.label}</p>
                        <p className="text-xs text-admin-subtle">{angle.desc}</p>

                        {/* URL input */}
                        <input
                          className="input-admin text-xs mt-2 py-1.5"
                          placeholder="Paste image URL here..."
                          value={url || ""}
                          onChange={e => setAngleUrl(angle.key, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>

                      {/* Preview thumb */}
                      {url && (
                        <Image src={url} alt={angle.label || ""} width={48} height={48} unoptimized
                          className="w-12 h-12 rounded-lg object-cover border border-admin-border-2 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => saveAsset(false)}
                disabled={saving}
                className="btn-md btn-admin flex-1"
              >
                Save draft
              </button>
              <button
                onClick={() => saveAsset(true)}
                disabled={saving || !allUploaded}
                className={cn(
                  "btn-md flex-1",
                  allUploaded
                    ? "btn-accent"
                    : "bg-admin-card-2 text-admin-subtle border border-admin-border-2 cursor-not-allowed"
                )}
              >
                {saving ? "Publishing..." : (
                  <><Sparkles className="w-4 h-4" />Publish AR</>
                )}
              </button>
            </div>

            {!allUploaded && (
              <p className="text-xs text-admin-subtle text-center">
                Upload all 5 angles to publish AR for this dish
              </p>
            )}
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <p className="font-semibold text-admin-text">Preview</p>

            {/* Main preview */}
            <div className="aspect-square bg-admin-card-2 rounded-2xl border border-admin-border-2 overflow-hidden relative">
              {arAsset?.[preview] ? (
                <Image
                  src={arAsset[preview]!}
                  alt={preview || ""}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-admin-subtle">
                  <Upload className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No image for {ANGLES.find(a => a.key === preview)?.label} angle yet</p>
                </div>
              )}

              {/* AR simulation overlay */}
              {arAsset?.[preview] && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <div className="glass-dark px-3 py-1.5 rounded-full text-xs text-white/80">
                    {selectedDish.name}
                  </div>
                </div>
              )}
            </div>

            {/* Angle thumbnails */}
            <div className="grid grid-cols-5 gap-2">
              {ANGLES.map(angle => (
                <button
                  key={angle.key}
                  onClick={() => setPreview(angle.key)}
                  className={cn(
                    "aspect-square rounded-xl overflow-hidden border transition-all",
                    preview === angle.key
                      ? "border-accent-cyan ring-1 ring-accent-cyan/30"
                      : "border-admin-border-2 hover:border-accent-cyan/30"
                  )}
                >
                  {arAsset?.[angle.key] ? (
                    <img src={arAsset[angle.key]!} alt={angle.label}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-admin-card-2 flex items-center justify-center text-xs text-admin-subtle">
                      {angle.label.charAt(0)}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* AR status */}
            <div className={cn(
              "card-admin p-4",
              arAsset?.is_published
                ? "bg-[#34d399]/10 border-[#34d399]/20"
                : "bg-admin-card-2 border-admin-border-2"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  arAsset?.is_published ? "bg-[#34d399]" : "bg-slate-500"
                )} />
                <p className="text-sm font-medium text-admin-text">
                  {arAsset?.is_published ? "AR is live" : "AR not published"}
                </p>
              </div>
              <p className="text-xs text-admin-subtle">
                {arAsset?.is_published
                  ? `Customers can view this dish in AR on their camera`
                  : `Upload all 5 angles and publish to enable AR for customers`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
