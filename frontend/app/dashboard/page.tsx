"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import Link from "next/link";
import { AuthGuard } from "../../components/auth-guard";
import { fetchDashboardKPIs, fetchActivityLog } from "../../lib/api";

interface KPI {
  label: string;
  value: string;
  color: string;
  icon: string;
  accent: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPI[]>([
    { label: "Available",         value: "—", color: "text-available", icon: "inventory_2",    accent: "" },
    { label: "Allocated",         value: "—", color: "text-allocated", icon: "person_check",   accent: "" },
    { label: "Maintenance Today", value: "—", color: "text-pending",   icon: "build",          accent: "border-l-4 border-l-pending" },
    { label: "Active Bookings",   value: "—", color: "text-ink",       icon: "event",          accent: "" },
    { label: "Pending Transfers", value: "—", color: "text-ink",       icon: "sync_alt",       accent: "" },
    { label: "Upcoming Returns",  value: "—", color: "text-ink",       icon: "keyboard_return", accent: "" },
  ]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [activities, setActivities]     = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const [kpiRes, actRes] = await Promise.all([
      fetchDashboardKPIs(),
      fetchActivityLog(5),
    ]);

    if (kpiRes.ok && kpiRes.data) {
      const d = kpiRes.data;
      // Backend returns { kpis: {...}, charts: { assetsByStatus: {...}, ... } }
      const kpis = d.kpis ?? d;
      const charts = d.charts ?? {};
      const assetsByStatus = charts.assetsByStatus ?? {};
      const bookingsByStatus = charts.bookingsByStatus ?? {};

      const available = assetsByStatus.AVAILABLE ?? kpis.available ?? d.assets_available ?? 0;
      const allocated = assetsByStatus.ALLOCATED ?? kpis.allocated ?? d.assets_allocated ?? 0;
      const openMaint = kpis.openMaintenance ?? d.maintenance_today ?? d.maintenance ?? 0;
      const activeBookings = (bookingsByStatus.ACTIVE ?? 0) + (bookingsByStatus.CONFIRMED ?? 0) + (kpis.upcomingBookings ?? d.active_bookings ?? d.bookings ?? 0);
      const pendingTransfers = d.pending_transfers ?? d.transfers ?? 0;
      const overdueAllocations = kpis.overdueAllocations ?? d.overdue_returns ?? d.overdue ?? 0;

      setKpis([
        { label: "Available",         value: String(available), color: "text-available", icon: "inventory_2",     accent: "" },
        { label: "Allocated",         value: String(allocated), color: "text-allocated", icon: "person_check",    accent: "" },
        { label: "Maintenance Today", value: String(openMaint), color: "text-pending",   icon: "build",           accent: "border-l-4 border-l-pending" },
        { label: "Active Bookings",   value: String(activeBookings), color: "text-ink",       icon: "event",           accent: "" },
        { label: "Pending Transfers", value: String(pendingTransfers), color: "text-ink",       icon: "sync_alt",        accent: "" },
        { label: "Upcoming Returns",  value: String(overdueAllocations), color: "text-ink",       icon: "keyboard_return", accent: "" },
      ]);
      setOverdueCount(overdueAllocations);
    }

    if (actRes.ok && actRes.data) setActivities(actRes.data);
    setLoading(false);
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    } catch { return "Recently"; }
  };

  const activityMeta = (act: any) => {
    const t = (act.action ?? act.event_type ?? "").toLowerCase();
    if (t.includes("alloc"))       return { icon: "person_check",  bg: "bg-allocated/10 border-allocated/20", color: "text-allocated", tagColor: "bg-allocated" };
    if (t.includes("book"))        return { icon: "event_available", bg: "bg-ink/5 border-slate/20",          color: "text-ink",       tagColor: "bg-ink" };
    if (t.includes("maint"))       return { icon: "build_circle",   bg: "bg-available/10 border-available/20", color: "text-available", tagColor: "bg-available" };
    return                                { icon: "history",         bg: "bg-slate/10 border-slate/20",        color: "text-slate",     tagColor: "bg-slate" };
  };

  const activityText = (act: any) => {
    const desc = act.description ?? act.message ?? "";
    if (desc) return <span className="text-ink">{desc}</span>;
    const t = (act.action ?? act.event_type ?? "").toLowerCase();
    if (t.includes("alloc")) return <><span className="font-semibold text-ink">Asset</span> allocated</>;
    if (t.includes("book"))  return <><span className="font-semibold text-ink">Booking</span> confirmed</>;
    if (t.includes("maint")) return <><span className="font-semibold text-ink">Maintenance</span> updated</>;
    return <span className="text-ink capitalize">{t.replace(/_/g, " ")}</span>;
  };

  return (
    <AuthGuard>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <main className="md:ml-sidebar-width flex-1 flex flex-col">
          {/* Top bar */}
          <header className="bg-surface border-b border-slate/10 h-16 px-gutter flex justify-between items-center sticky top-0 z-40">
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Today&apos;s Overview</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="material-symbols-outlined text-on-surface-variant hover:text-ink cursor-pointer transition-colors">notifications</span>
                {overdueCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-blocked rounded-full" />}
              </div>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-ink cursor-pointer">help</span>
            </div>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            {/* Overdue banner */}
            {overdueCount > 0 && (
              <div className="bg-panel p-4 rounded border-l-4 border-l-blocked shadow-sm mb-stack-lg flex items-center justify-between kpi-card">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blocked">warning</span>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-blocked">{overdueCount} asset{overdueCount !== 1 ? "s" : ""} overdue for return</h3>
                    <p className="font-body-sm text-on-surface-variant mt-1">Flagged for immediate follow-up and reallocation block.</p>
                  </div>
                </div>
                <Link href="/allocation" className="bg-panel border border-slate/20 text-ink px-4 py-2 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
                  View Details
                </Link>
              </div>
            )}

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-md mb-stack-lg">
              {kpis.map((k) => (
                <div key={k.label} className={`bg-panel p-6 rounded kpi-card flex flex-col justify-between h-full ${k.accent}`}>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider mb-2">{k.label}</span>
                  <div className="flex items-end justify-between">
                    <span className={`font-display-kpi text-display-kpi ${k.color} ${loading ? "animate-pulse opacity-40" : ""}`}>{k.value}</span>
                    <span className={`material-symbols-outlined text-[32px] ${k.color} opacity-50`}>{k.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <div className="bg-panel p-6 rounded kpi-card">
                  <h3 className="font-headline-md text-headline-md text-ink mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link href="/assets" className="w-full bg-ink text-on-primary py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-primary transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">add_circle</span> Register Asset
                    </Link>
                    <Link href="/booking" className="w-full bg-panel border border-slate/20 text-ink py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
                      <span className="material-symbols-outlined text-[18px]">calendar_add_on</span> Book Resource
                    </Link>
                    <Link href="/maintenance" className="w-full bg-panel border border-slate/20 text-ink py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
                      <span className="material-symbols-outlined text-[18px]">support_agent</span> Raise Request
                    </Link>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <div className="bg-panel p-6 rounded kpi-card h-full">
                  <h3 className="font-headline-md text-headline-md text-ink mb-6 flex items-center justify-between">
                    Recent Activity
                    <Link href="/activity" className="text-sm font-label-caps text-label-caps uppercase text-slate hover:text-ink transition-colors">View All</Link>
                  </h3>

                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl mb-2">history</span>
                      <p className="text-body-sm">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activities.map((act, i) => {
                        const m = activityMeta(act);
                        const date = act.createdAt ?? act.create_date ?? "";
                        return (
                          <div key={act.id ?? i} className="flex gap-4 items-start relative group">
                            <div className="w-px h-full bg-slate/10 absolute left-4 top-8 -bottom-6 group-last:hidden" />
                            <div className={`w-8 h-8 rounded-full ${m.bg} flex items-center justify-center shrink-0 z-10 border`}>
                              <span className={`material-symbols-outlined ${m.color} text-[16px]`}>{m.icon}</span>
                            </div>
                            <div className="flex-1 pb-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-body-sm text-on-surface-variant">{activityText(act)}</p>
                                <span className="font-label-caps text-label-caps text-slate">{date ? timeAgo(date) : ""}</span>
                              </div>
                              {(act.entityId || act.asset_id) && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="inline-flex items-center bg-fog px-2 py-1 asset-tag-notch relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-2 bg-tag-line z-10" />
                                    <span className="font-label-mono text-label-mono text-ink pl-3 relative z-20">
                                      {act.entityId ?? act.asset_id?.[1]?.split(" ")[0] ?? ""}
                                    </span>
                                    <div className={`absolute bottom-0 left-0 h-[2px] w-0 ${m.tagColor} transition-all duration-300 group-hover:w-full z-20`} />
                                  </div>
                                  <span className="text-xs text-slate font-body-sm capitalize">
                                    {(act.action ?? act.event_type ?? "").replace(/_/g, " ").toLowerCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
