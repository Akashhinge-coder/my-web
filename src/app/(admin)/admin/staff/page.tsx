"use client";
import { useEffect, useState, useCallback } from "react";
import { staffApi } from "@/frontend/api/staff.api";
import { cn } from "@/lib/utils";
import { Plus, Edit2, Trash2, Check, X, Loader2, Users, Shield } from "lucide-react";
import type { Staff, UserRole } from "@/types/domain";

const ROLES = [
  { value: "admin",   label: "Admin",   color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", desc: "Full access" },
  { value: "manager", label: "Manager", color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30",   desc: "Floor + billing" },
  { value: "waiter",  label: "Waiter",  color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30",  desc: "Assigned tables" },
  { value: "kitchen", label: "Kitchen", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30", desc: "Display only" },
];

const EMPTY = { name: "", role: "waiter" as UserRole, phone: "", shift_start: "09:00", shift_end: "21:00" };

export default function StaffPage() {
  const [staff,    setStaff]   = useState<Staff[]>([]);
  const [loading,  setLoading] = useState(true);
  const [showAdd,  setShowAdd] = useState(false);
  const [form,     setForm]    = useState({ ...EMPTY });
  const [saving,   setSaving]  = useState(false);
  const [editId,   setEditId]  = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      const data = await staffApi.list();
      setStaff(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  async function saveStaff() {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        phone: form.phone || null,
        shift_start: form.shift_start || null,
        shift_end: form.shift_end || null,
      };
      if (editId) {
        await staffApi.update(editId, payload);
      } else {
        await staffApi.create(payload);
      }
      setShowAdd(false);
      setEditId(null);
      setForm({ ...EMPTY });
      await fetchStaff();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function deleteStaff(id: string) {
    if (!confirm("Remove this staff member?")) return;
    try {
      await staffApi.delete(id);
      await fetchStaff();
    } catch (error) {
      console.error(error);
    }
  }

  function openEdit(s: Staff) {
    setForm({ name: s.name, role: s.role, phone: s.phone || "", shift_start: s.shift_start || "09:00", shift_end: s.shift_end || "21:00" });
    setEditId(s.id);
    setShowAdd(true);
  }

  const roleConfig = (role: string) => ROLES.find(r => r.value === role) || ROLES[2];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-white">Staff</h1>
          <p className="page-subtitle">{staff.length} team members</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ ...EMPTY }); }} className="btn-md btn-primary mt-1">
          <Plus className="w-4 h-4" />Add Staff
        </button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map(role => (
          <div key={role.value} className={cn("rounded-xl border p-4", role.bg)}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className={cn("w-3.5 h-3.5", role.color)} />
              <span className={cn("text-xs font-medium", role.color)}>{role.label}</span>
            </div>
            <p className={cn("text-2xl font-display font-semibold", role.color)}>
              {staff.filter(s => s.role === role.value).length}
            </p>
            <p className="text-[10px] text-ink-4 mt-0.5">{role.desc}</p>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="card-dark p-6 border-brand/30">
          <h3 className="font-semibold text-white mb-5">
            {editId ? "Edit Staff Member" : "Add New Staff Member"}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label text-ink-3">Full name</label>
              <input className="input-dark" placeholder="Rahul Sharma"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label text-ink-3">Mobile number</label>
              <input className="input-dark" placeholder="98765 43210"
                value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          {/* Role selector */}
          <div className="mb-4">
            <label className="label text-ink-3">Role</label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map(role => (
                <button key={role.value}
                  onClick={() => setForm(p => ({ ...p, role: role.value as UserRole }))}
                  className={cn("px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                    form.role === role.value ? `${role.bg} ${role.color}` : "border-dark-border text-ink-4"
                  )}
                >
                  {role.label}
                  <span className="ml-1 opacity-60">· {role.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shift */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="label text-ink-3">Shift start</label>
              <input className="input-dark" type="time"
                value={form.shift_start} onChange={e => setForm(p => ({ ...p, shift_start: e.target.value }))} />
            </div>
            <div>
              <label className="label text-ink-3">Shift end</label>
              <input className="input-dark" type="time"
                value={form.shift_end} onChange={e => setForm(p => ({ ...p, shift_end: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setShowAdd(false); setEditId(null); }} className="btn-md btn-dark flex-1">
              <X className="w-4 h-4" />Cancel
            </button>
            <button onClick={saveStaff} disabled={saving || !form.name} className="btn-md btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editId ? "Save Changes" : "Add Staff"}
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card-dark p-5 shimmer h-20" />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-ink-4 opacity-30" />
          <p className="text-ink-3 font-medium">No staff members yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-md btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />Add first staff member
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(s => {
            const cfg = roleConfig(s.role);
            return (
              <div key={s.id} className="card-dark p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-dark-tertiary border border-dark-border flex items-center justify-center text-white font-bold flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white text-sm">{s.name}</p>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-4">
                    {s.phone && <span>📱 {s.phone}</span>}
                    {s.shift_start && s.shift_end && (
                      <span>🕐 {s.shift_start} – {s.shift_end}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="p-2 rounded-xl text-ink-4 hover:text-white hover:bg-dark-tertiary transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteStaff(s.id)} className="p-2 rounded-xl text-ink-4 hover:text-red-400 hover:bg-red-500/10 transition-all">
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
