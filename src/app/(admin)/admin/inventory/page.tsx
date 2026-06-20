"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import { inventoryApi } from "@/frontend/api/inventory.api";
import { cn } from "@/lib/utils";
import { Plus, Package, AlertTriangle, Edit2, Trash2, Check, X, Loader2 } from "lucide-react";
import type { InventoryItem } from "@/types/domain";

const UNITS = ["kg","g","L","ml","pcs","dozen","bag","bottle","box"];
const EMPTY = { ingredient_name: "", unit: "kg", current_qty: "", low_stock_alert: "1" };

export default function InventoryPage() {
  const [items,    setItems]    = useState<InventoryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form,     setForm]     = useState({ ...EMPTY });
  const [saving,   setSaving]   = useState(false);
  const [filter,   setFilter]   = useState<"all"|"low">("all");

  const fetchItems = useCallback(async () => {
    try {
      const data = await inventoryApi.list();
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function saveItem() {
    if (!form.ingredient_name) return;
    setSaving(true);
    try {
      const payload = {
        ingredient_name: form.ingredient_name.trim(),
        unit:            form.unit,
        current_qty:     parseFloat(form.current_qty) || 0,
        low_stock_alert: parseFloat(form.low_stock_alert) || 1,
      };
      if (editId) {
        await inventoryApi.update(editId, payload);
      } else {
        await inventoryApi.create(payload);
      }
      setShowAdd(false);
      setEditId(null);
      setForm({ ...EMPTY });
      await fetchItems();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function updateQty(id: string, delta: number) {
    try {
      await inventoryApi.adjustQuantity(id, delta);
      await fetchItems();
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await inventoryApi.delete(id);
      await fetchItems();
    } catch (error) {
      console.error(error);
    }
  }

  function openEdit(item: InventoryItem) {
    setForm({ ingredient_name: item.ingredient_name, unit: item.unit, current_qty: item.current_qty.toString(), low_stock_alert: item.low_stock_alert.toString() });
    setEditId(item.id);
    setShowAdd(true);
  }

  const lowStockItems = items.filter(i => i.current_qty <= i.low_stock_alert);
  const filtered = filter === "low" ? lowStockItems : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-white">Inventory</h1>
          <p className="page-subtitle text-slate-400">{items.length} ingredients · {lowStockItems.length} low stock</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ ...EMPTY }); }} className="btn-md btn-accent mt-1">
          <Plus className="w-4 h-4" />Add Item
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium text-sm">Low stock alert</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              {lowStockItems.map(i => i.ingredient_name).join(", ")} — running low
            </p>
          </div>
          <button onClick={() => setFilter(filter === "low" ? "all" : "low")}
            className="ml-auto text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap">
            {filter === "low" ? "Show all" : "Show low stock"}
          </button>
        </div>
      )}

      {/* Add/Edit form */}
      {showAdd && (
        <div className="card-admin p-5 border-accent-cyan/30">
          <h3 className="font-semibold text-white mb-4">{editId ? "Edit Item" : "Add Ingredient"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="label text-slate-400">Ingredient name</label>
              <input className="input-admin" placeholder="Tomatoes, Chicken, Rice..."
                value={form.ingredient_name} onChange={e => setForm(p => ({ ...p, ingredient_name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label text-slate-400">Unit</label>
              <select className="input-admin" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-slate-400">Current qty</label>
              <input className="input-admin" type="number" placeholder="0"
                value={form.current_qty} onChange={e => setForm(p => ({ ...p, current_qty: e.target.value }))} />
            </div>
          </div>
          <div className="mb-5 max-w-xs">
            <label className="label text-slate-400">Low stock alert at</label>
            <input className="input-admin" type="number" placeholder="1"
              value={form.low_stock_alert} onChange={e => setForm(p => ({ ...p, low_stock_alert: e.target.value }))} />
            <p className="text-xs text-slate-500 mt-1">Alert when stock falls below this amount</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowAdd(false); setEditId(null); }} className="btn-md btn-admin flex-1">
              <X className="w-4 h-4" />Cancel
            </button>
            <button onClick={saveItem} disabled={saving || !form.ingredient_name} className="btn-md btn-accent flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editId ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="card-admin p-4 animate-pulse h-16 bg-white/5" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-30" />
          <p className="text-slate-400 font-medium">No inventory items yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-md btn-accent mt-4 inline-flex">
            <Plus className="w-4 h-4" />Add first item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const isLow = item.current_qty <= item.low_stock_alert;
            const pct   = Math.min(100, (item.current_qty / (item.low_stock_alert * 3)) * 100);
            return (
              <div key={item.id} className={cn("card-admin-hover p-4 flex items-center gap-4 transition-all", isLow && "border-[#facc15]/30")}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-white text-sm">{item.ingredient_name}</p>
                    {isLow && <AlertTriangle className="w-3.5 h-3.5 text-[#facc15] flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-sm font-semibold", isLow ? "text-[#facc15]" : "text-[#34d399]")}>
                      {item.current_qty} {item.unit}
                    </span>
                    <span className="text-xs text-slate-500">alert at {item.low_stock_alert} {item.unit}</span>
                  </div>
                  <div className="mt-2 h-1 bg-admin-card-2 border border-admin-border-2 rounded-full overflow-hidden w-32">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: isLow ? "#facc15" : "#34d399" }} />
                  </div>
                </div>

                {/* Quick qty adjust */}
                <div className="flex items-center gap-1 bg-admin-card-2 rounded-xl px-2 py-1 border border-admin-border-2">
                  <button onClick={() => updateQty(item.id, -1)}
                    className="w-6 h-6 rounded-md text-slate-500 hover:text-white transition-colors font-bold">−</button>
                  <span className="text-sm font-semibold text-white w-10 text-center">{item.current_qty}</span>
                  <button onClick={() => updateQty(item.id, 1)}
                    className="w-6 h-6 rounded-md text-slate-500 hover:text-white transition-colors font-bold">+</button>
                </div>

                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
