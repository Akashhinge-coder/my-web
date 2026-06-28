"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import { waitlistApi } from "@/frontend/api/waitlist.api";
import { cn, timeAgo } from "@/lib/utils";
import { Plus, Users, Check, X, MessageCircle, Loader2, Clock } from "lucide-react";
import type { Waitlist } from "@/types/domain";

const EMPTY = { guest_name: "", guest_phone: "", party_size: "2" };

export default function WaitlistPage() {
  const [restaurantName, setRestaurantName] = useState("");
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState({ ...EMPTY });
  const [saving,   setSaving]   = useState(false);

  const fetchWaitlist = useCallback(async () => {
    try {
      const data = await waitlistApi.getPageData();
      setRestaurantName(data.restaurantName);
      setWaitlist(data.entries);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist]);

  async function addToWaitlist() {
    if (!form.guest_name || !form.guest_phone) return;
    setSaving(true);
    try {
      await waitlistApi.addGuest({
        guest_name:  form.guest_name.trim(),
        guest_phone: form.guest_phone,
        party_size:  parseInt(form.party_size, 10),
      });
      setShowAdd(false);
      setForm({ ...EMPTY });
      await fetchWaitlist();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function notifyGuest(entry: Waitlist) {
    try {
      await waitlistApi.notifyGuest(entry.id);
      const msg = encodeURIComponent(`Hi ${entry.guest_name}! Your table at ${restaurantName} is ready. Please come in! 🍽️`);
      const phone = entry.guest_phone.replace(/\D/g, "");
      window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
      await fetchWaitlist();
    } catch (error) {
      console.error(error);
    }
  }

  async function seatGuest(id: string) {
    try {
      await waitlistApi.seatGuest(id);
      await fetchWaitlist();
    } catch (error) {
      console.error(error);
    }
  }

  async function removeGuest(id: string) {
    try {
      await waitlistApi.markLeft(id);
      await fetchWaitlist();
    } catch (error) {
      console.error(error);
    }
  }

  const waiting  = waitlist.filter(w => w.status === "waiting");
  const notified = waitlist.filter(w => w.status === "notified");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-foreground">Waitlist</h1>
          <p className="page-subtitle text-muted-foreground">{waiting.length} waiting · {notified.length} notified</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-md btn-accent mt-1">
          <Plus className="w-4 h-4" />Add to waitlist
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card-admin p-5 border-primary/30 bg-card">
          <h3 className="font-semibold text-foreground mb-4">Add Walk-in Guest</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-1">
              <label className="label text-muted-foreground">Guest name <span className="text-red-500">*</span></label>
              <input className="input-admin" placeholder="Patel Family" autoFocus
                value={form.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-muted-foreground">Phone <span className="text-red-500">*</span></label>
              <input className="input-admin" placeholder="98765 43210"
                value={form.guest_phone} onChange={e => setForm(p => ({ ...p, guest_phone: e.target.value }))} />
            </div>
            <div>
              <label className="label text-muted-foreground">Party size <span className="text-red-500">*</span></label>
              <select className="input-admin" value={form.party_size}
                onChange={e => setForm(p => ({ ...p, party_size: e.target.value }))}>
                {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n} people</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="btn-md btn-outline flex-1"><X className="w-4 h-4" />Cancel</button>
            <button onClick={addToWaitlist} disabled={saving || !form.guest_name || !form.guest_phone} className="btn-md btn-accent flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to Waitlist
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card-admin p-5 animate-pulse h-20 bg-muted/20" />)}
        </div>
      ) : waitlist.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground font-medium">Waitlist is empty</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Walk-in guests will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {waitlist.map((entry, index) => (
            <div key={entry.id} className={cn(
              "card-admin card-hover p-4 flex items-center gap-4 bg-card",
              entry.status === "notified" && "border-emerald-500/30"
            )}>
              {/* Position number */}
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-foreground text-sm">{entry.guest_name}</p>
                  {entry.status === "notified" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      Notified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />{entry.party_size} people
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{timeAgo(entry.joined_at)}
                  </span>
                  {entry.guest_phone && <span>📱 {entry.guest_phone}</span>}
                </div>
              </div>

              <div className="flex gap-2">
                {entry.guest_phone && entry.status === "waiting" && (
                  <button onClick={() => notifyGuest(entry)}
                    className="btn-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs">
                    <MessageCircle className="w-3 h-3" />Notify
                  </button>
                )}
                {entry.status === "notified" && (
                  <button onClick={() => seatGuest(entry.id)}
                    className="btn-sm bg-primary/10 text-primary border border-primary/20 text-xs">
                    <Check className="w-3 h-3" />Seated
                  </button>
                )}
                <button onClick={() => removeGuest(entry.id)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
