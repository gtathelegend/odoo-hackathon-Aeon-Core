"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { fetchActivityLog } from "../../lib/api";

const filterButtons = [
  { label: "All", value: "all" },
  { label: "Alerts", value: "alerts" },
  { label: "Approvals", value: "approvals" },
  { label: "Bookings", value: "bookings" },
];

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    const result = await fetchActivityLog(100);
    if (result.ok && result.data) {
      setActivities(result.data);
    }
    setLoading(false);
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "Z"); // Treat as UTC
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  const getActivityColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("alert") || t.includes("overdue") || t.includes("discrepancy") || t.includes("fail")) return "blocked";
    if (t.includes("approved") || t.includes("completed") || t.includes("resolved")) return "available";
    if (t.includes("requested") || t.includes("pending") || t.includes("ongoing")) return "pending";
    return "allocated";
  };

  const getCategory = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("booking")) return "Resource Booking";
    if (t.includes("maintenance")) return "Maintenance";
    if (t.includes("audit") || t.includes("mark")) return "Audit / Compliance";
    if (t.includes("login") || t.includes("signup") || t.includes("lockout")) return "Security";
    return "Allocation & Transfer";
  };

  const filteredActivities = activities.filter((act) => {
    if (activeFilter === "all") return true;
    const type = (act.event_type || "").toLowerCase();
    if (activeFilter === "alerts") {
      return type.includes("alert") || type.includes("overdue") || type.includes("discrepancy") || type.includes("fail");
    }
    if (activeFilter === "approvals") {
      return type.includes("approved") || type.includes("approval");
    }
    if (activeFilter === "bookings") {
      return type.includes("booking");
    }
    return true;
  });

  return (
    <div className="bg-fog text-on-surface font-body-sm min-h-screen flex">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar-width p-margin-main flex flex-col h-screen overflow-hidden">
        {/* Header & Filters */}
        <header className="mb-stack-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-ink font-bold">Activity Log</h1>
            <p className="text-body-sm font-body-sm text-slate mt-1">System-wide event tracking</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {filterButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => setActiveFilter(btn.value)}
                className={`px-4 py-2 rounded text-label-caps font-label-caps border transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 ${
                  activeFilter === btn.value
                    ? "bg-ink text-on-primary border-ink"
                    : "bg-panel text-ink border-slate/20 hover:border-slate/50"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </header>

        {/* Activity List Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate">history</span>
              <p className="text-body-sm">No activity events found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-w-6xl pb-stack-lg">
              {filteredActivities.map((activity, idx) => {
                const color = getActivityColor(activity.event_type || "");
                const isAlert = color === "blocked";
                const isRoom = activity.asset_id && activity.asset_id[1]?.toLowerCase().includes("room");
                return (
                  <div
                    key={activity.id || idx}
                    className={`bg-panel p-4 rounded-DEFAULT flex flex-col sm:flex-row gap-4 items-start sm:items-center relative overflow-hidden group transition-colors ${
                      isAlert ? "border border-blocked shadow-sm" : "border border-slate/10 hover:border-slate/30"
                    }`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${color}`}></div>
                    <div className="w-full sm:w-auto min-w-[120px]">
                      {isRoom ? (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate" style={{ fontSize: "20px" }}>
                            meeting_room
                          </span>
                          <span className="text-label-mono font-label-mono text-ink">{activity.asset_id?.[1].split(" ")[0]}</span>
                        </div>
                      ) : activity.asset_id ? (
                        <div className="asset-tag-corner bg-surface-variant border border-slate/20 px-2 py-0.5 text-label-mono font-label-mono text-ink relative inline-block before:absolute before:top-0 before:left-0 before:w-1.5 before:h-1.5 before:bg-tag-line after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:transition-all after:duration-300 group-hover:after:w-full after:bg-{color}">
                          {activity.asset_id[1].split(" ")[0]}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate" style={{ fontSize: "20px" }}>
                            settings
                          </span>
                          <span className="text-label-mono font-label-mono text-ink">SYSTEM</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-body-sm font-body-sm ${isAlert ? "text-blocked font-medium" : "text-ink"}`}>
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-label-caps font-label-caps text-slate">{getCategory(activity.event_type || "")}</span>
                        {activity.user_id && (
                          <span className="text-[11px] text-slate/70">by {activity.user_id[1]}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-label-mono font-label-mono text-slate sm:text-right whitespace-nowrap">
                      {formatTimeAgo(activity.create_date)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
