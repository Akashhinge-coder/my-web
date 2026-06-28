"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from "react";
import { tablesApi } from "@/frontend/api/tables.api";
import { useTablesRealtime } from "@/frontend/hooks/useTablesRealtime";
import { cn, generateQRUrl } from "@/lib/utils";
import { Plus, QrCode, Users, Edit2, Check, X, Download, Trash2 } from "lucide-react";
import type { Table, TableStatus } from "@/types/domain";

const STATUS_CONFIG = {
  available: { label: "Available", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-500" },
  occupied:  { label: "Occupied",  color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", dot: "bg-red-500" },
  reserved:  { label: "Reserved",  color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-500" },
  cleaning:  { label: "Cleaning",  color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500" },
} as const;

type TableStatusKey = keyof typeof STATUS_CONFIG;

export default function TablesPage() {
  const [tables,         setTables]         = useState<Table[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [restaurantId,   setRestaurantId]   = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlug] = useState<string>("");
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [showAdd,        setShowAdd]        = useState(false);
  const [newTable,       setNewTable]       = useState({ table_number: "", seating_capacity: "4", table_type: "regular", floor: "Ground Floor" });
  const [saving,         setSaving]         = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      const data = await tablesApi.getPageData();
      setTables(data.tables);
      setRestaurantId(data.restaurantId);
      setRestaurantSlug(data.restaurantSlug);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  useTablesRealtime(restaurantId, fetchTables);

  async function updateStatus(tableId: string, status: TableStatus) {
    try {
      await tablesApi.updateStatus(tableId, status);
      await fetchTables();
    } catch (error) {
      console.error(error);
    }
  }

  async function addTable() {
    if (!newTable.table_number.trim()) return;
    setSaving(true);
    try {
      await tablesApi.create({
        table_number: newTable.table_number.trim(),
        seating_capacity: parseInt(newTable.seating_capacity, 10),
        table_type: newTable.table_type as Table["table_type"],
        floor: newTable.floor,
      });
      setNewTable({ table_number: "", seating_capacity: "4", table_type: "regular", floor: "Ground Floor" });
      setShowAdd(false);
      await fetchTables();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTable(tableId: string) {
    if (!confirm("Are you sure you want to delete this table?")) return;
    try {
      await tablesApi.delete(tableId);
      await fetchTables();
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || "Failed to delete table. Make sure it does not have any active sessions or orders.";
      alert(msg);
    }
  }


  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map((s) => [s, tables.filter((t) => t.status === s).length])
  ) as Record<TableStatusKey, number>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title text-foreground">Tables</h1>
          <p className="page-subtitle text-muted-foreground">{tables.length} tables · Live status</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-md btn-accent mt-1">
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.entries(STATUS_CONFIG) as [TableStatusKey, typeof STATUS_CONFIG[TableStatusKey]][]).map(([status, cfg]) => (
          <div key={status} className={cn("rounded-2xl border bg-admin-card p-5 transition-all duration-300 border-admin-border-2", cfg.bg.split(' ')[1])}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]", cfg.dot)} />
              <span className={cn("text-[10px] font-black uppercase tracking-widest opacity-60", cfg.color)}>{cfg.label}</span>
            </div>
            <p className={cn("text-3xl font-display font-black tracking-tight", cfg.color)}>{counts[status]}</p>
          </div>
        ))}
      </div>

      {/* Add table form */}
      {showAdd && (
        <div className="card-admin p-5 border-primary/30">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            New Table
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label text-muted-foreground">Table Number</label>
              <input
                className="input-admin"
                placeholder="T13"
                value={newTable.table_number}
                onChange={e => setNewTable(p => ({ ...p, table_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-muted-foreground">Seats</label>
              <select
                className="input-admin"
                value={newTable.seating_capacity}
                onChange={e => setNewTable(p => ({ ...p, seating_capacity: e.target.value }))}
              >
                {[2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n} seats</option>)}
              </select>
            </div>
            <div>
              <label className="label text-muted-foreground">Type</label>
              <select
                className="input-admin"
                value={newTable.table_type}
                onChange={e => setNewTable(p => ({ ...p, table_type: e.target.value }))}
              >
                <option value="regular">Regular</option>
                <option value="booth">Booth</option>
                <option value="outdoor">Outdoor</option>
                <option value="private">Private Room</option>
              </select>
            </div>
            <div>
              <label className="label text-muted-foreground">Floor</label>
              <input
                className="input-admin"
                placeholder="Ground Floor"
                value={newTable.floor}
                onChange={e => setNewTable(p => ({ ...p, floor: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addTable} disabled={saving} className="btn-md btn-accent flex-1">
              {saving ? "Adding…" : <><Check className="w-4 h-4" />Add Table</>}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-md btn-admin flex-1">
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tables grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="card-admin p-5 space-y-3">
              <div className="shimmer h-4 rounded w-16 bg-muted/20" />
              <div className="shimmer h-3 rounded w-24 bg-muted/20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => {
            const cfg = STATUS_CONFIG[table.status as TableStatusKey];
            return (
              <div key={table.id} className={cn("card-admin-hover p-4 flex flex-col gap-3 transition-all", `hover:${cfg.bg}`)}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-display font-semibold text-foreground leading-none">
                      {table.table_number}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{table.seating_capacity} seats</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingId(editingId === table.id ? null : table.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTable(table.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border self-start", cfg.bg, cfg.color)}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                </div>

                {/* Floor tag */}
                {table.floor && (
                  <p className="text-[10px] text-muted-foreground bg-muted/20 rounded-md px-2 py-1 self-start border border-border/5">
                    {table.floor}
                  </p>
                )}

                {/* Status changer (when editing) */}
                {editingId === table.id && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Change status</p>
                    {(Object.keys(STATUS_CONFIG) as TableStatusKey[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => { updateStatus(table.id, s); setEditingId(null); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all",
                          table.status === s
                            ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} font-medium`
                            : "text-muted-foreground hover:bg-muted/20"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_CONFIG[s].dot)} />
                        {STATUS_CONFIG[s].label}
                        {table.status === s && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* QR */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <a
                    href={generateQRUrl(restaurantSlug, table.id, table.qr_token)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <QrCode className="w-3 h-3" />
                    View QR
                  </a>
                  <span className="text-border">·</span>
                  <button
                    onClick={() => {
                      const url = generateQRUrl(restaurantSlug, table.id, table.qr_token);
                      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`, "_blank");
                    }}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Download
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
