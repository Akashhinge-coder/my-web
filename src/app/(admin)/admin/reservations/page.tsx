"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import { reservationsApi } from "@/frontend/api/reservations.api";
import { cn } from "@/lib/utils";
import { Plus, Calendar, Users, Phone, Check, X, Loader2, Clock, MessageCircle } from "lucide-react";
import type { ReservationStatus } from "@/types/domain";
import type { ReservationTableOption, ReservationWithTable } from "@/types/reservations";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "text-primary",   bg: "bg-primary/10 border-primary/20" },
  seated:    { label: "Seated",    color: "text-emerald-600 dark:text-emerald-400",  bg: "bg-emerald-500/10 border-emerald-500/20" },
  cancelled: { label: "Cancelled", color: "text-destructive",    bg: "bg-destructive/10 border-destructive/20" },
  no_show:   { label: "No Show",   color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
};

const EMPTY = { guest_name: "", guest_phone: "", party_size: "2", reserved_at: "", notes: "", table_id: "" };

export default function ReservationsPage() {
  const [restaurantName, setRestaurantName] = useState("");
  const [reservations, setReservations] = useState<ReservationWithTable[]>([]);
  const [tables,       setTables]       = useState<ReservationTableOption[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showAdd,      setShowAdd]      = useState(false);
  const [form,         setForm]         = useState({ ...EMPTY });
  const [saving,       setSaving]       = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      const data = await reservationsApi.getPageData();
      setRestaurantName(data.restaurantName);
      setReservations(data.reservations);
      setTables(data.tables);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveReservation() {
    if (!form.guest_name || !form.reserved_at) return;
    setSaving(true);
    try {
      await reservationsApi.create({
        guest_name:  form.guest_name.trim(),
        guest_phone: form.guest_phone,
        party_size:  parseInt(form.party_size, 10),
        reserved_at: form.reserved_at,
        notes:       form.notes || null,
        table_id:    form.table_id || null,
      });
      setShowAdd(false);
      setForm({ ...EMPTY });
      await fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    try {
      await reservationsApi.updateStatus(id, status);
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  }

  const filtered = reservations.filter(r =>
    activeStatus === "all" ? true : r.status === activeStatus
  );

  const compatibleTables = (partySize: number) =>
    tables.filter(t => t.seating_capacity >= partySize && t.status === "available");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-foreground">Reservations</h1>
          <p className="page-subtitle text-muted-foreground">Today & upcoming bookings</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-md btn-accent mt-1">
          <Plus className="w-4 h-4" />New Booking
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {["all", "confirmed", "seated", "cancelled", "no_show"].map(s => (
          <button key={s}
            onClick={() => setActiveStatus(s)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-all duration-200",
              activeStatus === s
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
            )}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
            <span className={cn(
              "ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-black",
              activeStatus === s ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
            )}>
              {s === "all" ? reservations.length : reservations.filter(r => r.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card p-6 border-primary/30 bg-card">
          <h3 className="font-semibold text-foreground mb-5">New Reservation</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label text-muted-foreground">Guest name</label>
              <input className="input" placeholder="Sharma Family"
                value={form.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label text-muted-foreground">Phone number</label>
              <input className="input" placeholder="98765 43210"
                value={form.guest_phone} onChange={e => setForm(p => ({ ...p, guest_phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label text-muted-foreground">Party size</label>
              <select className="input" value={form.party_size}
                onChange={e => setForm(p => ({ ...p, party_size: e.target.value }))}>
                {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-muted-foreground">Date & time</label>
              <input className="input" type="datetime-local"
                value={form.reserved_at} onChange={e => setForm(p => ({ ...p, reserved_at: e.target.value }))} />
            </div>
            <div>
              <label className="label text-muted-foreground">
                Assign table
                <span className="text-muted-foreground normal-case font-normal ml-1">(optional)</span>
              </label>
              <select className="input" value={form.table_id}
                onChange={e => setForm(p => ({ ...p, table_id: e.target.value }))}>
                <option value="">Auto assign</option>
                {compatibleTables(parseInt(form.party_size, 10)).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.table_number} ({t.seating_capacity} seats)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-5">
            <label className="label text-muted-foreground">Notes (optional)</label>
            <input className="input" placeholder="Birthday celebration, window seat preferred..."
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="btn-md btn-outline flex-1">
              <X className="w-4 h-4" />Cancel
            </button>
            <button onClick={saveReservation} disabled={saving || !form.guest_name || !form.reserved_at}
              className="btn-md btn-accent flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirm Booking
            </button>
          </div>
        </div>
      )}

      {/* Reservations list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card-admin p-5 animate-pulse h-24 bg-white/5" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-30" />
          <p className="text-slate-400 font-medium">No reservations for today</p>
          <button onClick={() => setShowAdd(true)} className="btn-md btn-accent mt-4 inline-flex">
            <Plus className="w-4 h-4" />Add booking
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(res => {
            const cfg = STATUS_CONFIG[res.status as keyof typeof STATUS_CONFIG];
            const resDate = new Date(res.reserved_at);
            const waLink = `https://wa.me/91${res.guest_phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Hi ${res.guest_name}! Your table at ${restaurantName} is confirmed for ${resDate.toLocaleString("en-IN")} for ${res.party_size} people. See you soon! 🍽️`)}`;

            return (
              <div key={res.id} className="card p-5 hover:border-primary/30 transition-all group bg-card">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                        {res.guest_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-foreground text-base">{res.guest_name}</p>
                          <span className={cn("text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-tighter border", cfg?.bg, cfg?.color)}>
                            {cfg?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{res.guest_phone}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{res.party_size} people</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 pl-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span className="font-medium text-foreground">{resDate.toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
                      </div>
                      {res.restaurant_tables && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/5">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium text-foreground">Table {res.restaurant_tables.table_number}</span>
                        </div>
                      )}
                    </div>

                    {res.notes && (
                      <p className="mt-4 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg border border-border/5 italic">
                        &ldquo;{res.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-border/5 pt-4 md:pt-0 md:pl-6">
                    {res.status === "confirmed" && (
                      <button onClick={() => updateStatus(res.id, "seated")}
                        className="flex-1 md:w-32 btn-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-bold">
                        <Check className="w-3.5 h-3.5" />Mark Seated
                      </button>
                    )}
                    {res.status === "confirmed" && (
                      <button onClick={() => updateStatus(res.id, "cancelled")}
                        className="flex-1 md:w-32 btn-sm bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all font-bold">
                        <X className="w-3.5 h-3.5" />Cancel
                      </button>
                    )}
                    {res.guest_phone && (
                      <a href={waLink} target="_blank" rel="noreferrer"
                        className="flex-1 md:w-32 btn-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-bold flex items-center gap-1.5 justify-center">
                        <MessageCircle className="w-3.5 h-3.5" />WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
