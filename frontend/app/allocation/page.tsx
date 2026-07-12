"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { apiClient } from "../../lib/api-client";

interface Allocation {
  id: string;
  status: string;
  allocationDate: string;
  expectedReturnDate: string | null;
  notes: string | null;
  asset?: { assetTag: string; name: string } | null;
  employee?: { user: { firstName: string; lastName: string } } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-pending/10 text-pending",
  ACTIVE: "bg-allocated/10 text-allocated",
  RETURNED: "bg-available/10 text-available",
  OVERDUE: "bg-blocked/10 text-blocked",
  CANCELLED: "bg-slate/10 text-slate",
};

export default function AllocationPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllocations();
  }, []);

  async function loadAllocations() {
    try {
      const data = await apiClient.get<{ items: Allocation[]; total: number }>("/allocation", {
        query: { page: 1, limit: 25 },
      });
      setAllocations(data.items ?? []);
    } catch {
      setAllocations([]);
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
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Allocation & Transfer</h2>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            <div className="flex justify-end mb-stack-lg">
              <button className="bg-ink text-on-primary px-6 py-2.5 rounded-lg font-label-caps text-label-caps uppercase font-bold hover:bg-primary transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                New Allocation
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            ) : allocations.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">swap_horiz</span>
                <p className="text-body-sm">No allocations found</p>
              </div>
            ) : (
              <div className="bg-panel rounded-lg border border-slate/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-slate/10 bg-fog/50">
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Asset</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Employee</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Status</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Allocated</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Return By</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate/5">
                      {allocations.map((alloc) => (
                        <tr key={alloc.id} className="hover:bg-fog/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink">{alloc.asset?.name ?? "—"}</div>
                            <div className="text-xs text-on-surface-variant">{alloc.asset?.assetTag}</div>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {alloc.employee?.user ? `${alloc.employee.user.firstName} ${alloc.employee.user.lastName}` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[alloc.status] ?? "bg-slate/10 text-slate"}`}>
                              {alloc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{new Date(alloc.allocationDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{alloc.expectedReturnDate ? new Date(alloc.expectedReturnDate).toLocaleDateString() : "—"}</td>
                          <td className="px-4 py-3 text-on-surface-variant truncate max-w-[200px]">{alloc.notes ?? "—"}</td>
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
