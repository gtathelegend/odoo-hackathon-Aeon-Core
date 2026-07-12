"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import Link from "next/link";
import { fetchDashboardKPIs, fetchActivityLog, fetchAllocations } from "../../lib/api";

interface KPI {
  label: string;
  value: string;
  color: string;
  icon: string;
  accent: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPI[]>([
    { label: "Available", value: "...", color: "text-available", icon: "inventory_2", accent: "" },
    { label: "Allocated", value: "...", color: "text-allocated", icon: "person_check", accent: "" },
    { label: "Maintenance Today", value: "...", color: "text-pending", icon: "build", accent: "border-l-4 border-l-pending" },
    { label: "Active Bookings", value: "...", color: "text-ink", icon: "event", accent: "" },
    { label: "Pending Transfers", value: "...", color: "text-ink", icon: "sync_alt", accent: "" },
    { label: "Upcoming Returns", value: "...", color: "text-ink", icon: "keyboard_return", accent: "" },
  ]);
  
  const [overdueCount, setOverdueCount] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    
    // Load KPIs
    const kpiResult = await fetchDashboardKPIs();
    if (kpiResult.ok && kpiResult.data) {
      const data = kpiResult.data;
      setKpis([
        { label: "Available", value: data.assets_available?.toString() || "0", color: "text-available", icon: "inventory_2", accent: "" },
        { label: "Allocated", value: data.assets_allocated?.toString() || "0", color: "text-allocated", icon: "person_check", accent: "" },
        { label: "Maintenance Today", value: data.maintenance_today?.toString() || "0", color: "text-pending", icon: "build", accent: "border-l-4 border-l-pending" },
        { label: "Active Bookings", value: data.active_bookings?.toString() || "0", color: "text-ink", icon: "event", accent: "" },
        { label: "Pending Transfers", value: data.pending_transfers?.toString() || "0", color: "text-ink", icon: "sync_alt", accent: "" },
        { label: "Upcoming Returns", value: data.upcoming_returns?.toString() || "0", color: "text-ink", icon: "keyboard_return", accent: "" },
      ]);
      setOverdueCount(data.overdue_returns || 0);
    }

    // Load Recent Activity
    const activityResult = await fetchActivityLog(5);
    if (activityResult.ok && activityResult.data) {
      setActivities(activityResult.data);
    }

    setLoading(false);
  };

  const formatActivityText = (activity: any) => {
    const type = activity.event_type || "";
    const desc = activity.description || "";
    
    if (type.includes("allocated") || type.includes("allocation")) {
      return (
        <>
          <span className="font-semibold text-ink">{activity.asset_id?.[1] || "Asset"}</span> allocated to{" "}
          <span className="font-medium text-ink">{activity.user_id?.[1] || "User"}</span>
        </>
      );
    } else if (type.includes("booking")) {
      return (
        <>
          <span className="font-semibold text-ink">Booking</span> confirmed
        </>
      );
    } else if (type.includes("maintenance")) {
      return (
        <>
          <span className="font-semibold text-ink">{activity.asset_id?.[1] || "Asset"}</span> maintenance{" "}
          {desc.toLowerCase().includes("resolved") ? "resolved" : "requested"}
        </>
      );
    }
    return <span className="text-ink">{desc}</span>;
  };

  const getActivityIcon = (activity: any) => {
    const type = activity.event_type || "";
    if (type.includes("allocated")) return { icon: "person_check", bg: "bg-allocated/10 border-allocated/20", color: "text-allocated", tagColor: "bg-allocated" };
    if (type.includes("booking")) return { icon: "event_available", bg: "bg-ink/5 border-slate/20", color: "text-ink", tagColor: "bg-ink" };
    if (type.includes("maintenance")) return { icon: "build_circle", bg: "bg-available/10 border-available/20", color: "text-available", tagColor: "bg-available" };
    return { icon: "history", bg: "bg-slate/10 border-slate/20", color: "text-slate", tagColor: "bg-slate" };
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  return (
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
                  <h3 className="font-headline-md text-headline-md text-blocked">{overdueCount} assets overdue for return</h3>
                  <p className="font-body-sm text-on-surface-variant mt-1">Flagged for immediate follow-up and reallocation block.</p>
                </div>
              </div>
              <Link
                href="/allocation"
                className="bg-panel border border-slate/20 text-ink px-4 py-2 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
              >
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
                  <span className={`font-display-kpi text-display-kpi ${k.color} ${loading ? "animate-pulse" : ""}`}>{k.value}</span>
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
                  <Link
                    href="/assets"
                    className="w-full bg-ink text-on-primary py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-primary transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span> Register Asset
                  </Link>
                  <Link
                    href="/booking"
                    className="w-full bg-panel border border-slate/20 text-ink py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">calendar_add_on</span> Book Resource
                  </Link>
                  <Link
                    href="/maintenance"
                    className="w-full bg-panel border border-slate/20 text-ink py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
                  >
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
                  <Link href="/activity" className="text-sm font-label-caps text-label-caps uppercase text-slate hover:text-ink transition-colors">
                    View All
                  </Link>
                </h3>
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-2">history</span>
                    <p className="text-body-sm">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activities.map((activity, i) => {
                      const iconData = getActivityIcon(activity);
                      return (
                        <div key={activity.id || i} className="flex gap-4 items-start relative group">
                          <div className="w-px h-full bg-slate/10 absolute left-4 top-8 -bottom-6 group-last:hidden" />
                          <div className={`w-8 h-8 rounded-full ${iconData.bg} flex items-center justify-center shrink-0 z-10 border`}>
                            <span className={`material-symbols-outlined ${iconData.color} text-[16px]`}>{iconData.icon}</span>
                          </div>
                          <div className="flex-1 pb-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-body-sm text-on-surface-variant">{formatActivityText(activity)}</p>
                              <span className="font-label-caps text-label-caps text-slate">{formatTimeAgo(activity.create_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {activity.asset_id && (
                                <div className="inline-flex items-center bg-fog px-2 py-1 asset-tag-notch group/tag cursor-pointer relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-2 h-2 bg-tag-line z-10" />
                                  <span className="font-label-mono text-label-mono text-ink pl-3 relative z-20">{activity.asset_id[1]?.split(" ")[0] || "Asset"}</span>
                                  <div className={`absolute bottom-0 left-0 h-[2px] w-0 ${iconData.tagColor} transition-all duration-300 group-hover/tag:w-full z-20`} />
                                </div>
                              )}
                              <span className="text-xs text-slate font-body-sm">{activity.event_type?.replace(/_/g, " ")}</span>
                            </div>
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
  );
}
