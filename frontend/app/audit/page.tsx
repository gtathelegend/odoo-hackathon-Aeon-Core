"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { apiClient } from "../../lib/api-client";

interface AuditCycle {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  _count?: { items: number };
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-pending/10 text-pending",
  IN_PROGRESS: "bg-allocated/10 text-allocated",
  COMPLETED: "bg-available/10 text-available",
  CLOSED: "bg-slate/10 text-slate",
};

export default function AuditPage() {
  const [audits, setAudits] = useState<AuditCycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudits();
  }, []);

  async function loadAudits() {
    try {
      const data = await apiClient.get<AuditCycle[]>("/audit", {
        query: { page: 1, limit: 25 },
      });
      setAudits(Array.isArray(data) ? data : []);
    } catch {
      setAudits([]);
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
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Audit</h2>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            <div className="flex justify-end mb-stack-lg">
              <button className="bg-ink text-on-primary px-6 py-2.5 rounded-lg font-label-caps text-label-caps uppercase font-bold hover:bg-primary transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                New Audit Cycle
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            ) : audits.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">fact_check</span>
                <p className="text-body-sm">No audit cycles found</p>
              </div>
            ) : (
              <div className="bg-panel rounded-lg border border-slate/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-slate/10 bg-fog/50">
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Name</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Status</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Start Date</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">End Date</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate/5">
                      {audits.map((audit) => (
                        <tr key={audit.id} className="hover:bg-fog/30 transition-colors cursor-pointer">
                          <td className="px-4 py-3 font-medium text-ink">{audit.name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[audit.status] ?? "bg-slate/10 text-slate"}`}>
                              {audit.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{new Date(audit.startDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{audit.endDate ? new Date(audit.endDate).toLocaleDateString() : "—"}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{audit._count?.items ?? 0}</td>
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
