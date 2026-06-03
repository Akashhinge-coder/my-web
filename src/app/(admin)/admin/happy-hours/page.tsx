"use client";

import { useCallback, useEffect, useState } from "react";
import {
  happyHoursApi,
  type HappyHour,
} from "@/frontend/api/happy-hours.api";
import { cn } from "@/lib/utils";
import { Plus, Clock, Trash2, Check, X, Loader2, ToggleLeft, ToggleRight, Zap } from "lucide-react";

const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

type HappyHourForm = {
  name: string;
  discountType: "flat" | "percent";
  discountValue: string;
  days: string[];
  startTime: string;
  endTime: string;
};

const EMPTY: HappyHourForm = {
  name: "",
  discountType: "percent",
  discountValue: "",
  days: [],
  startTime: "15:00",
  endTime: "18:00",
};

export default function HappyHoursPage() {
  const [hours, setHours] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchHours = useCallback(async () => {
    try {
      setError("");
      setHours(await happyHoursApi.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load happy hour rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHours();
  }, [fetchHours]);

  function toggleDay(day: string) {
    setForm((previous) => ({
      ...previous,
      days: previous.days.includes(day)
        ? previous.days.filter((value) => value !== day)
        : [...previous.days, day],
    }));
  }

  async function saveHappyHour() {
    if (!form.name || !form.discountValue || form.days.length === 0) return;

    setSaving(true);
    setError("");
    try {
      await happyHoursApi.create({
        name: form.name.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        days: form.days,
        startTime: form.startTime,
        endTime: form.endTime,
        isActive: true,
      });
      setShowAdd(false);
      setForm({ ...EMPTY });
      await fetchHours();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create happy hour rule");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setError("");
    try {
      await happyHoursApi.update(id, { isActive: !current });
      await fetchHours();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update happy hour rule");
    }
  }

  async function deleteHour(id: string) {
    if (!confirm("Delete this happy hour rule?")) return;

    setError("");
    try {
      await happyHoursApi.delete(id);
      await fetchHours();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete happy hour rule");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand" />Happy Hours
          </h1>
          <p className="page-subtitle">Time-based automatic discounts on your menu</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-md btn-primary mt-1">
          <Plus className="w-4 h-4" />Add Rule
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card-dark p-4 border-brand/20">
        <p className="text-xs text-ink-3 leading-relaxed">
          <span className="text-brand font-medium">How it works:</span> When a happy hour rule is active, the discount automatically applies to eligible items on the customer menu. Customers see the discounted price live - no coupon code needed.
        </p>
      </div>

      {showAdd && (
        <div className="card-dark p-6 border-brand/30">
          <h3 className="font-semibold text-white mb-5">New Happy Hour Rule</h3>
          <div className="space-y-4">
            <div>
              <label className="label text-ink-3">Rule name</label>
              <input
                className="input-dark"
                placeholder="Afternoon Special, Weekend Happy Hour..."
                value={form.name}
                onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-ink-3">Discount type</label>
                <div className="flex gap-2">
                  {[
                    { value: "percent", label: "% Off" },
                    { value: "flat", label: "Rs. Off" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setForm((previous) => ({ ...previous, discountType: type.value as "flat" | "percent" }))}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                        form.discountType === type.value
                          ? "bg-brand/10 border-brand/30 text-brand"
                          : "border-dark-border text-ink-4"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label text-ink-3">
                  {form.discountType === "percent" ? "Discount %" : "Discount Rs."}
                </label>
                <input
                  className="input-dark"
                  type="number"
                  placeholder={form.discountType === "percent" ? "20" : "50"}
                  value={form.discountValue}
                  onChange={(event) => setForm((previous) => ({ ...previous, discountValue: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-ink-3">Start time</label>
                <input
                  className="input-dark"
                  type="time"
                  value={form.startTime}
                  onChange={(event) => setForm((previous) => ({ ...previous, startTime: event.target.value }))}
                />
              </div>
              <div>
                <label className="label text-ink-3">End time</label>
                <input
                  className="input-dark"
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm((previous) => ({ ...previous, endTime: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="label text-ink-3">Active days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                      form.days.includes(day.value)
                        ? "bg-brand/10 border-brand/30 text-brand"
                        : "border-dark-border text-ink-4 hover:border-brand/30"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {form.days.length === 0 && (
                <p className="text-xs text-red-400 mt-1">Select at least one day</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="btn-md btn-dark flex-1">
                <X className="w-4 h-4" />Cancel
              </button>
              <button
                onClick={saveHappyHour}
                disabled={saving || !form.name || !form.discountValue || form.days.length === 0}
                className="btn-md btn-primary flex-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => <div key={item} className="card-dark p-5 shimmer h-24" />)}
        </div>
      ) : hours.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 mx-auto mb-4 text-ink-4 opacity-30" />
          <p className="text-ink-3 font-medium">No happy hour rules yet</p>
          <p className="text-xs text-ink-4 mt-1">Create time-based discounts to drive traffic in slow hours</p>
          <button onClick={() => setShowAdd(true)} className="btn-md btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />Create first rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {hours.map((hour) => (
            <div
              key={hour.id}
              className={cn(
                "card-dark p-5 transition-all",
                hour.isActive && "border-brand/40",
                !hour.isActive && "opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-white">{hour.name}</p>
                    {hour.isActive && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand">
                        Enabled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-4 flex-wrap">
                    <span className="text-brand font-semibold">
                      {hour.discountType === "percent" ? `${hour.discountValue}% off` : `Rs.${hour.discountValue} off`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {hour.startTime} - {hour.endTime}
                    </span>
                    <div className="flex gap-1">
                      {hour.days.map((day) => (
                        <span key={day} className="px-1.5 py-0.5 rounded-md bg-dark-tertiary border border-dark-border capitalize text-[10px]">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(hour.id, hour.isActive)}
                    className={cn("transition-colors", hour.isActive ? "text-green-400" : "text-ink-4")}
                  >
                    {hour.isActive
                      ? <ToggleRight className="w-6 h-6" />
                      : <ToggleLeft className="w-6 h-6" />
                    }
                  </button>
                  <button
                    onClick={() => deleteHour(hour.id)}
                    className="p-2 rounded-xl text-ink-4 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
