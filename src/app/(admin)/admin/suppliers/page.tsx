"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import { suppliersApi } from "@/frontend/api/suppliers.api";
import { cn } from "@/lib/utils";
import { Plus, Truck, Phone, Mail, MapPin, Edit2, Trash2, Check, X, Loader2 } from "lucide-react";
import type { Supplier } from "@/types/domain";

const EMPTY = { name: "", phone: "", email: "", address: "", notes: "" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY });
  const [saving,    setSaving]    = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await suppliersApi.list();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  async function saveSupplier() {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = {
        name:    form.name.trim(),
        phone:   form.phone   || null,
        email:   form.email   || null,
        address: form.address || null,
        notes:   form.notes   || null,
      };
      if (editId) {
        await suppliersApi.update(editId, payload);
      } else {
        await suppliersApi.create(payload);
      }
      setShowAdd(false);
      setEditId(null);
      setForm({ ...EMPTY });
      await fetchSuppliers();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(id: string) {
    if (!confirm("Delete this supplier?")) return;
    try {
      await suppliersApi.delete(id);
      await fetchSuppliers();
    } catch (error) {
      console.error(error);
    }
  }

  function openEdit(s: Supplier) {
    setForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "" });
    setEditId(s.id);
    setShowAdd(true);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-white">Suppliers</h1>
          <p className="page-subtitle text-slate-400">{suppliers.length} vendors</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ ...EMPTY }); }} className="btn-md btn-accent mt-1">
          <Plus className="w-4 h-4" />Add Supplier
        </button>
      </div>

      {showAdd && (
        <div className="card-admin p-6 border-accent-cyan/30">
          <h3 className="font-semibold text-white mb-5">{editId ? "Edit Supplier" : "Add Supplier"}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label text-slate-400">Supplier name *</label>
              <input className="input-admin" placeholder="Fresh Farms Pvt Ltd" autoFocus
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-slate-400">Phone</label>
              <input className="input-admin" placeholder="98765 43210"
                value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label text-slate-400">Email</label>
              <input className="input-admin" placeholder="supplier@email.com" type="email"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label text-slate-400">Address</label>
              <input className="input-admin" placeholder="APMC Market, Pune"
                value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <label className="label text-slate-400">Notes</label>
              <input className="input-admin" placeholder="Delivers Mon-Sat, call before 8am"
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowAdd(false); setEditId(null); }} className="btn-md btn-admin flex-1">
              <X className="w-4 h-4" />Cancel
            </button>
            <button onClick={saveSupplier} disabled={saving || !form.name} className="btn-md btn-accent flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editId ? "Save Changes" : "Add Supplier"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card-admin p-5 animate-pulse h-24 bg-white/5" />)}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-30" />
          <p className="text-slate-400 font-medium">No suppliers yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-md btn-accent mt-4 inline-flex">
            <Plus className="w-4 h-4" />Add first supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="card-admin-hover p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-accent-cyan" />
                  </div>
                  <p className="font-semibold text-white">{s.name}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteSupplier(s.id)} className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {s.phone   && <div className="flex items-center gap-2"><Phone   className="w-3 h-3" />{s.phone}</div>}
                {s.email   && <div className="flex items-center gap-2"><Mail    className="w-3 h-3" />{s.email}</div>}
                {s.address && <div className="flex items-center gap-2"><MapPin  className="w-3 h-3" />{s.address}</div>}
                {s.notes   && <p className="text-slate-400 bg-admin-card-2 border border-admin-border-2 rounded-lg px-2.5 py-1.5 mt-2">{s.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
