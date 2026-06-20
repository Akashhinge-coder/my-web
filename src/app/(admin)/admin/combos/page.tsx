"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/config/supabase/client";
import { formatINR, cn } from "@/lib/utils";
import { Plus, Package2, Trash2, Check, X, Loader2, ToggleLeft, ToggleRight, Pencil } from "lucide-react";

interface Dish { id: string; name: string; price: number; food_type: string; }
interface Combo {
  id: string; name: string; combo_price: number;
  dish_ids: string[]; savings_amount: number; is_active: boolean;
}

const EMPTY = { name: "", combo_price: "", dish_ids: [] as string[] };

export default function CombosPage() {
  const supabase = createClient();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [combos,   setCombos]   = useState<Combo[]>([]);
  const [dishes,   setDishes]   = useState<Dish[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,     setForm]     = useState({ ...EMPTY });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rest } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (rest) setRestaurantId(rest.id);
    }
    init();
  }, []);

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    const [{ data: combs }, { data: dishs }] = await Promise.all([
      supabase.from("combos").select("*").eq("restaurant_id", restaurantId).order("name"),
      supabase.from("dishes").select("id, name, price, food_type").eq("restaurant_id", restaurantId).eq("is_available", true).order("name"),
    ]);
    if (combs)  setCombos(combs as Combo[]);
    if (dishs)  setDishes(dishs as Dish[]);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleDish(dishId: string) {
    setForm(p => ({
      ...p,
      dish_ids: p.dish_ids.includes(dishId)
        ? p.dish_ids.filter(id => id !== dishId)
        : [...p.dish_ids, dishId]
    }));
  }

  const selectedDishes  = dishes.filter(d => form.dish_ids.includes(d.id));
  const originalPrice   = selectedDishes.reduce((s, d) => s + d.price, 0);
  const comboPrice      = parseFloat(form.combo_price) || 0;
  const savings         = originalPrice - comboPrice;

  async function saveCombo() {
    if (!restaurantId || !form.name || !form.combo_price || form.dish_ids.length < 2) return;
    setSaving(true);
    if (editingId) {
      await supabase.from("combos").update({
        name:           form.name.trim(),
        combo_price:    comboPrice,
        dish_ids:       form.dish_ids,
        savings_amount: Math.max(0, savings),
      }).eq("id", editingId);
    } else {
      await supabase.from("combos").insert({
        restaurant_id:  restaurantId,
        name:           form.name.trim(),
        combo_price:    comboPrice,
        dish_ids:       form.dish_ids,
        savings_amount: Math.max(0, savings),
        is_active:      true,
      });
    }
    setShowAdd(false);
    setForm({ ...EMPTY });
    setEditingId(null);
    setSaving(false);
    fetchData();
  }

  async function toggleCombo(id: string, active: boolean) {
    await supabase.from("combos").update({ is_active: !active }).eq("id", id);
    fetchData();
  }

  async function deleteCombo(id: string) {
    if (!confirm("Delete this combo?")) return;
    await supabase.from("combos").delete().eq("id", id);
    fetchData();
  }

  function getDishNames(dishIds: string[]) {
    return dishIds.map(id => dishes.find(d => d.id === id)?.name).filter(Boolean).join(" + ");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-white flex items-center gap-2">
            <Package2 className="w-6 h-6 text-accent-cyan" />Combo Meals
          </h1>
          <p className="page-subtitle text-slate-400">Bundle dishes at a special price</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ ...EMPTY }); setShowAdd(true); }} className="btn-md btn-accent mt-1">
          <Plus className="w-4 h-4" />New Combo
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="card-admin p-6 border-accent-cyan/30">
          <h3 className="font-semibold text-white mb-5">{editingId ? "Edit Combo Meal" : "Create Combo Meal"}</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="label text-slate-400">Combo name</label>
              <input className="input-admin" placeholder="Family Thali, Student Combo..."
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label text-slate-400">Combo price (₹)</label>
              <input className="input-admin" type="number" placeholder="399"
                value={form.combo_price} onChange={e => setForm(p => ({ ...p, combo_price: e.target.value }))} />
            </div>
          </div>

          <div className="mb-4">
            <label className="label text-slate-400">Select dishes (min 2)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {dishes.map(dish => (
                <button key={dish.id}
                  onClick={() => toggleDish(dish.id)}
                  className={cn("text-left p-2.5 rounded-xl border text-xs transition-all",
                    form.dish_ids.includes(dish.id)
                      ? "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan"
                      : "border-admin-border-2 text-slate-400 hover:border-accent-cyan/30"
                  )}
                >
                  <p className="font-medium truncate">{dish.name}</p>
                  <p className="text-slate-500">{formatINR(dish.price)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Price summary */}
          {form.dish_ids.length >= 2 && comboPrice > 0 && (
            <div className="bg-admin-card-2 border border-admin-border-2 rounded-xl p-4 mb-5 text-sm">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Original price</span>
                <span>{formatINR(originalPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Combo price</span>
                <span>{formatINR(comboPrice)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-admin-border-2 pt-2">
                <span className="text-[#34d399]">Customer saves</span>
                <span className="text-[#34d399]">{formatINR(Math.max(0, savings))}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setShowAdd(false); setEditingId(null); setForm({ ...EMPTY }); }} className="btn-md btn-admin flex-1">
              <X className="w-4 h-4" />Cancel
            </button>
            <button onClick={saveCombo}
              disabled={saving || !form.name || !form.combo_price || form.dish_ids.length < 2}
              className="btn-md btn-accent flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? "Save Changes" : "Create Combo"}
            </button>
          </div>
        </div>
      )}

      {/* Combos list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="card-admin p-5 animate-pulse h-24 bg-white/5" />)}
        </div>
      ) : combos.length === 0 ? (
        <div className="text-center py-16">
          <Package2 className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-30" />
          <p className="text-slate-400 font-medium">No combos yet</p>
          <p className="text-xs text-slate-500 mt-1">Combos increase average order value</p>
          <button onClick={() => setShowAdd(true)} className="btn-md btn-accent mt-4 inline-flex">
            <Plus className="w-4 h-4" />Create first combo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {combos.map(combo => (
            <div key={combo.id} className={cn("card-admin-hover p-5 transition-all", !combo.is_active && "opacity-50")}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-white mb-1">{combo.name}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{getDishNames(combo.dish_ids)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleCombo(combo.id, combo.is_active)}
                    className={cn("transition-colors", combo.is_active ? "text-[#34d399]" : "text-slate-500")}>
                    {combo.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button onClick={() => {
                    setEditingId(combo.id);
                    setForm({
                      name: combo.name,
                      combo_price: String(combo.combo_price),
                      dish_ids: combo.dish_ids,
                    });
                    setShowAdd(true);
                  }}
                    className="p-2 rounded-xl text-slate-500 hover:text-accent-cyan hover:bg-accent-cyan/10 transition-all"
                    title="Edit combo"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteCombo(combo.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-admin-border-2">
                <div>
                  <p className="font-display font-bold text-accent-cyan text-xl">{formatINR(combo.combo_price)}</p>
                  <p className="text-[10px] text-slate-500">combo price</p>
                </div>
                {combo.savings_amount > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-[#34d399]/10 border border-[#34d399]/20">
                    <p className="text-xs font-semibold text-[#34d399]">Save {formatINR(combo.savings_amount)}</p>
                  </div>
                )}
                <span className="text-xs text-slate-500 ml-auto">{combo.dish_ids.length} items</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
