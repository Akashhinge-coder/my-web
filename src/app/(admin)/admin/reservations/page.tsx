"use client";
import { useEffect, useState, useCallback } from "react";
import { reservationsApi } from "@/frontend/api/reservations.api";
import { cn } from "@/lib/utils";
import { Plus, Calendar, Users, Phone, Check, X, Loader2, Clock, MessageCircle } from "lucide-react";
import type { ReservationStatus } from "@/types/domain";
import type { ReservationTableOption, ReservationWithTable } from "@/types/reservations";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30" },
  seated:    { label: "Seated",    color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30" },
  cancelled: { label: "Cancelled", color: "text-red-400",    bg: "bg-red-400/10 border-red-400/30" },
  no_show:   { label: "No Show",   color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30" },
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
          <h1 className="page-title text-white">Reservations</h1>
          <p className="page-subtitle">Today & upcoming bookings</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-md btn-primary mt-1">
          <Plus className="w-4 h-4" />New Booking
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {["all", "confirmed", "seated", "cancelled", "no_show"].map(s => (
          <button key={s}
            onClick={() => setActiveStatus(s)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all",
              activeStatus === s
                ? "bg-brand text-white border-brand"
                : "bg-dark-card border-dark-border text-ink-3 hover:text-white"
            )}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
            <span className="ml-1.5 text-xs opacity-70">
              {s === "all" ? reservations.length : reservations.filter(r => r.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card-dark p-6 border-brand/30">
          <h3 className="font-semibold text-white mb-5">New Reservation</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label text-ink-3">Guest name</label>
              <input className="input-dark" placeholder="Sharma Family"
                value={form.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label text-ink-3">Phone number</label>
              <input className="input-dark" placeholder="98765 43210"
                value={form.guest_phone} onChange={e => setForm(p => ({ ...p, guest_phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label text-ink-3">Party size</label>
              <select className="input-dark" value={form.party_size}
                onChange={e => setForm(p => ({ ...p, party_size: e.target.value }))}>
                {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-ink-3">Date & time</label>
              <input className="input-dark" type="datetime-local"
                value={form.reserved_at} onChange={e => setForm(p => ({ ...p, reserved_at: e.target.value }))} />
            </div>
            <div>
              <label className="label text-ink-3">
                Assign table
                <span className="text-ink-4 normal-case font-normal ml-1">(optional)</span>
              </label>
              <select className="input-dark" value={form.table_id}
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
            <label className="label text-ink-3">Notes (optional)</label>
            <input className="input-dark" placeholder="Birthday celebration, window seat preferred..."
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="btn-md btn-dark flex-1">
              <X className="w-4 h-4" />Cancel
            </button>
            <button onClick={saveReservation} disabled={saving || !form.guest_name || !form.reserved_at}
              className="btn-md btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirm Booking
            </button>
          </div>
        </div>
      )}

      {/* Reservations list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card-dark p-5 shimmer h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-ink-4 opacity-30" />
          <p className="text-ink-3 font-medium">No reservations for today</p>
          <button onClick={() => setShowAdd(true)} className="btn-md btn-primary mt-4 inline-flex">
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
              <div key={res.id} className="card-dark p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white">{res.guest_name}</p>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", cfg?.bg, cfg?.color)}>
                        {cfg?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {resDate.toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {res.party_size} people
                      </span>
                      {res.restaurant_tables && (
                        <span>Table {res.restaurant_tables.table_number}</span>
                      )}
                      {res.guest_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {res.guest_phone}
                        </span>
                      )}
                    </div>
                    {res.notes && (
                      <p className="text-xs text-amber-400/70 mt-1.5 bg-amber-400/5 border border-amber-400/10 rounded-lg px-2 py-1">
                        📝 {res.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5">
                    {res.status === "confirmed" && (
                      <button onClick={() => updateStatus(res.id, "seated")}
                        className="btn-sm bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 text-xs">
                        <Check className="w-3 h-3" />Seat
                      </button>
                    )}
                    {res.status === "confirmed" && (
                      <button onClick={() => updateStatus(res.id, "cancelled")}
                        className="btn-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs">
                        <X className="w-3 h-3" />Cancel
                      </button>
                    )}
                    {res.guest_phone && (
                      <a href={waLink} target="_blank" rel="noreferrer"
                        className="btn-sm bg-green-600/10 text-green-500 border border-green-600/20 hover:bg-green-600/20 text-xs flex items-center gap-1 justify-center">
                        <MessageCircle className="w-3 h-3" />WA
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
