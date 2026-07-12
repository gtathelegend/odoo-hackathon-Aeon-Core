"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { apiClient } from "../../lib/api-client";

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  condition: string;
  currentValue: number | null;
  category?: { name: string } | null;
  location?: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-available/10 text-available",
  ALLOCATED: "bg-allocated/10 text-allocated",
  RESERVED: "bg-pending/10 text-pending",
  MAINTENANCE: "bg-pending/10 text-pending",
  LOST: "bg-blocked/10 text-blocked",
  RETIRED: "bg-slate/10 text-slate",
  DISPOSED: "bg-slate/10 text-slate",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    try {
      const data = await apiClient.get<Asset[]>("/assets", {
        query: { page: 1, limit: 25 },
      });
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.assetTag.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AuthGuard>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <main className="md:ml-sidebar-width flex-1 flex flex-col">
          <header className="bg-surface border-b border-slate/10 h-16 px-gutter flex justify-between items-center sticky top-0 z-40">
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Assets</h2>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            {/* Search + Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-stack-lg">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search assets by name or tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate/20 bg-panel text-body-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
              <button
                onClick={() => {/* TODO: open create modal */}}
                className="bg-ink text-on-primary px-6 py-2.5 rounded-lg font-label-caps text-label-caps uppercase font-bold hover:bg-primary transition-colors flex items-center gap-2 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Register Asset
              </button>
            </div>

            {/* Asset Table */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">inventory_2</span>
                <p className="text-body-sm">No assets found</p>
              </div>
            ) : (
              <div className="bg-panel rounded-lg border border-slate/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-slate/10 bg-fog/50">
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Tag</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Name</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Category</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Location</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Status</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Condition</th>
                        <th className="text-right px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate/5">
                      {filtered.map((asset) => (
                        <tr key={asset.id} className="hover:bg-fog/30 transition-colors cursor-pointer">
                          <td className="px-4 py-3 font-label-mono text-label-mono text-ink">{asset.assetTag}</td>
                          <td className="px-4 py-3 text-ink font-medium">{asset.name}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{asset.category?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{asset.location?.name ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[asset.status] ?? "bg-slate/10 text-slate"}`}>
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{asset.condition}</td>
                          <td className="px-4 py-3 text-right text-ink">{asset.currentValue != null ? `$${asset.currentValue.toLocaleString()}` : "—"}</td>
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
