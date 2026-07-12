"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { apiClient } from "../../lib/api-client";

interface MaintenanceRequest {
  id: string;
  status: string;
  priority: string;
  description: string;
  issueType: string | null;
  createdAt: string;
  dueDate: string | null;
  asset?: { assetTag: string; name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-pending/10 text-pending",
  ASSIGNED: "bg-allocated/10 text-allocated",
  IN_PROGRESS: "bg-allocated/10 text-allocated",
  RESOLVED: "bg-available/10 text-available",
  REJECTED: "bg-blocked/10 text-blocked",
  CANCELLED: "bg-slate/10 text-slate",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-available",
  MEDIUM: "text-pending",
  HIGH: "text-blocked",
  CRITICAL: "text-blocked font-bold",
};

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const data = await apiClient.get<{ items: MaintenanceRequest[]; total: number }>("/maintenance", {
        query: { page: 1, limit: 25 },
      });
      setRequests(data.items ?? []);
    } catch {
      setRequests([]);
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
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Maintenance</h2>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            <div className="flex justify-end mb-stack-lg">
              <button className="bg-ink text-on-primary px-6 py-2.5 rounded-lg font-label-caps text-label-caps uppercase font-bold hover:bg-primary transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Raise Request
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">build</span>
                <p className="text-body-sm">No maintenance requests found</p>
              </div>
            ) : (
              <div className="bg-panel rounded-lg border border-slate/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-slate/10 bg-fog/50">
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Asset</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Description</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Priority</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Status</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Created</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate/5">
                      {requests.map((req) => (
                        <tr key={req.id} className="hover:bg-fog/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink">{req.asset?.name ?? "—"}</div>
                            <div className="text-xs text-on-surface-variant">{req.asset?.assetTag}</div>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant truncate max-w-[250px]">{req.description}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${PRIORITY_COLORS[req.priority] ?? "text-slate"}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[req.status] ?? "bg-slate/10 text-slate"}`}>
                              {req.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{new Date(req.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{req.dueDate ? new Date(req.dueDate).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
