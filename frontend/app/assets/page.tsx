"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { fetchAssets } from "../../lib/api";

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");

  useEffect(() => {
    loadAssets();
  }, [search, stateFilter]);

  const loadAssets = async () => {
    setLoading(true);
    const filterState = stateFilter === "all" ? undefined : stateFilter;
    const res = await fetchAssets({
      search: search || undefined,
      state: filterState,
    });
    if (res.ok && res.data) {
      setAssets(res.data);
    }
    setLoading(false);
  };

  const getStateData = (state: string) => {
    switch (state) {
      case "available":
        return { title: "Available", color: "available" };
      case "allocated":
        return { title: "Allocated", color: "allocated" };
      case "reserved":
        return { title: "Reserved", color: "allocated" };
      case "under_maintenance":
        return { title: "Maintenance", color: "pending" };
      case "lost":
        return { title: "Lost", color: "blocked" };
      case "retired":
        return { title: "Retired", color: "slate" };
      case "disposed":
        return { title: "Disposed", color: "slate" };
      default:
        return { title: state, color: "slate" };
    }
  };

  const statusOptions = [
    { label: "All Assets", value: "all" },
    { label: "Available", value: "available" },
    { label: "Allocated", value: "allocated" },
    { label: "Maintenance", value: "under_maintenance" },
    { label: "Lost", value: "lost" },
  ];

  return (
    <div className="bg-fog min-h-screen flex">
      <Sidebar />
      <main className="md:ml-sidebar-width flex-1 min-h-screen p-margin-main pt-24 md:pt-margin-main flex flex-col gap-stack-lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="font-headline-lg text-headline-lg md:text-[24px] text-ink font-bold">Asset Directory</h2>
          <button className="bg-ink text-on-primary px-4 py-2 rounded text-label-caps font-label-caps font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Register Asset
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-panel p-4 rounded shadow-sm border border-slate/10 flex flex-col gap-stack-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none">search</span>
            <input
              className="w-full bg-surface border border-slate/20 rounded pl-10 pr-4 py-2 text-body-sm font-body-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-shadow"
              placeholder="Search by tag, serial, or name..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStateFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-label-caps font-label-caps border transition-colors flex items-center gap-1 ${
                  stateFilter === opt.value
                    ? "bg-ink text-on-primary border-ink"
                    : "bg-surface border-slate/20 text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-panel rounded shadow-sm border border-slate/10 overflow-hidden min-h-[250px] flex flex-col justify-between">
          {loading ? (
            <div className="flex-1 flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
            </div>
          ) : (
            <div className="overflow-x-auto w-full flex-1">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-surface-container-low border-b border-slate/10">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-on-surface-variant text-[14px] w-32">Tag</th>
                    <th className="py-3 px-4 font-semibold text-on-surface-variant text-[14px]">Name</th>
                    <th className="py-3 px-4 font-semibold text-on-surface-variant text-[14px]">Category</th>
                    <th className="py-3 px-4 font-semibold text-on-surface-variant text-[14px] w-40">Status</th>
                    <th className="py-3 px-4 font-semibold text-on-surface-variant text-[14px]">Location</th>
                    <th className="py-3 px-4 font-semibold text-on-surface-variant text-[14px] w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate/10 font-body-sm text-body-sm">
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate">No assets found matching the criteria.</td>
                    </tr>
                  ) : (
                    assets.map((asset) => {
                      const stateInfo = getStateData(asset.state);
                      return (
                        <tr key={asset.id} className="hover:bg-surface-container-low/50 transition-colors group">
                          <td className="py-3 px-4">
                            <div className="asset-tag bg-surface border border-slate/10 rounded-sm">
                              <span className="font-label-mono text-label-mono text-ink">{asset.asset_tag}</span>
                              <div className={`asset-tag-underline bg-${stateInfo.color}`} />
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-ink">{asset.name}</td>
                          <td className="py-3 px-4 text-on-surface-variant">{asset.category_id ? asset.category_id[1] : "--"}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full bg-${stateInfo.color}`} />
                              <span className={`text-${stateInfo.color} font-medium text-xs`}>{stateInfo.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant">{asset.location || "--"}</td>
                          <td className="py-3 px-4 text-center">
                            <button className="text-slate hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none">
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate/10 flex items-center justify-between bg-surface-container-lowest shrink-0">
            <span className="text-xs text-on-surface-variant">Showing {assets.length} entries</span>
            <div className="flex gap-1">
              <button className="p-1 rounded hover:bg-surface border border-transparent hover:border-slate/10 text-slate disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="p-1 rounded hover:bg-surface border border-transparent hover:border-slate/10 text-slate" disabled>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
