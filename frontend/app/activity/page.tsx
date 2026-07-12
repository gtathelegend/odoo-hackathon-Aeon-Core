"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { apiClient } from "../../lib/api-client";

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

const ACTION_ICONS: Record<string, string> = {
  "auth.login": "login",
  "auth.register": "person_add",
  "auth.logout": "logout",
  "asset.create": "add_circle",
  "asset.update": "edit",
  "asset.delete": "delete",
  "allocation.create": "swap_horiz",
  "allocation.return": "keyboard_return",
  "booking.create": "event_available",
  "booking.cancel": "event_busy",
  "maintenance.create": "build",
  "maintenance.resolve": "check_circle",
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadActivities();
  }, [page]);

  async function loadActivities() {
    setLoading(true);
    try {
      const data = await apiClient.get<{ items: ActivityItem[]; total: number }>("/audit/activity", {
        query: { page, limit: 30 },
      });
      setActivities(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // Fallback: try different endpoint
      try {
        const data = await apiClient.get<{ items: ActivityItem[]; total: number }>("/dashboard/activity", {
          query: { page, limit: 30 },
        });
        setActivities(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setActivities([]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <main className="md:ml-sidebar-width flex-1 flex flex-col">
          <header className="bg-surface border-b border-slate/10 h-16 px-gutter flex justify-between items-center sticky top-0 z-40">
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Activity Log</h2>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">history</span>
                <p className="text-body-sm">No activity recorded yet</p>
              </div>
            ) : (
              <>
                <div className="bg-panel rounded-lg border border-slate/10 divide-y divide-slate/5">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 px-4 py-3 hover:bg-fog/30 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-fog flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px] text-ink">
                          {ACTION_ICONS[activity.action] ?? "info"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm text-ink">
                          <span className="font-medium">{activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : "System"}</span>
                          {" — "}
                          <span className="text-on-surface-variant">{activity.action}</span>
                          {activity.entityType && (
                            <span className="text-on-surface-variant"> on {activity.entityType}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-on-surface-variant shrink-0">
                        {new Date(activity.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {total > 30 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-4 py-2 rounded border border-slate/20 text-body-sm disabled:opacity-40 hover:bg-surface transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-body-sm text-on-surface-variant">
                      Page {page} of {Math.ceil(total / 30)}
                    </span>
                    <button
                      disabled={page >= Math.ceil(total / 30)}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-4 py-2 rounded border border-slate/20 text-body-sm disabled:opacity-40 hover:bg-surface transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
