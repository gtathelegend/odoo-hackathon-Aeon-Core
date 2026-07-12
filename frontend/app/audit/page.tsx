"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import {
  fetchAuditCycles,
  fetchAuditMarks,
  fetchAssets,
  createAuditMark,
  closeAuditCycle,
} from "../../lib/api";

export default function AuditPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | "">("");
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Mark Notes State
  const [discrepancyNotes, setDiscrepancyNotes] = useState<{ [assetId: number]: string }>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      const cycle = cycles.find((c) => c.id === selectedCycleId);
      setSelectedCycle(cycle || null);
      loadMarks(Number(selectedCycleId));
    } else {
      setSelectedCycle(null);
      setMarks([]);
    }
  }, [selectedCycleId, cycles]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [cycleRes, assetRes] = await Promise.all([
        fetchAuditCycles(),
        fetchAssets(),
      ]);

      if (cycleRes.ok && cycleRes.data) {
        setCycles(cycleRes.data);
        if (cycleRes.data.length > 0) {
          setSelectedCycleId(cycleRes.data[0].id);
        }
      }
      if (assetRes.ok && assetRes.data) {
        setAssets(assetRes.data);
      }
    } catch (err) {
      console.error("Error loading audit data:", err);
    }
    setLoading(false);
  };

  const loadMarks = async (cycleId: number) => {
    const res = await fetchAuditMarks(cycleId);
    if (res.ok && res.data) {
      setMarks(res.data);
    }
  };

  // Determine in-scope assets based on cycle criteria
  const inScopeAssets = assets.filter((asset) => {
    if (!selectedCycle) return false;
    
    const scopeType = selectedCycle.scope_type || "all";
    if (scopeType === "department") {
      // Check if asset's department matches cycle's department_ids
      // Odoo Many2many relation fields return as arrays of IDs
      const cycleDepts = selectedCycle.department_ids || [];
      if (!asset.department_id) return false;
      return cycleDepts.includes(asset.department_id[0]);
    }
    if (scopeType === "location") {
      return asset.location === selectedCycle.location;
    }
    return true; // all assets
  });

  const getAssetMark = (assetId: number) => {
    return marks.find((m) => m.asset_id && m.asset_id[0] === assetId);
  };

  const handleMarkAsset = async (assetId: number, state: "verified" | "missing" | "damaged") => {
    if (!selectedCycleId) return;
    if (selectedCycle?.status === "closed") {
      setMessage({ type: "error", text: "This audit cycle is closed and locked." });
      return;
    }

    setMessage(null);
    const notes = discrepancyNotes[assetId] || "";
    const payload = {
      cycle_id: Number(selectedCycleId),
      asset_id: assetId,
      mark: state,
      notes: notes,
    };

    const res = await createAuditMark(payload);
    if (res.ok) {
      loadMarks(Number(selectedCycleId));
      // Clear notes for this asset on success
      setDiscrepancyNotes((prev) => ({ ...prev, [assetId]: "" }));
    } else {
      setMessage({ type: "error", text: res.error || "Failed to submit verification mark." });
    }
  };

  const handleCloseCycle = async () => {
    if (!selectedCycleId) return;
    if (confirm("Are you sure you want to close this audit cycle? This will lock all marks and transition missing assets to Lost.")) {
      setLoading(true);
      const res = await closeAuditCycle(Number(selectedCycleId));
      if (res.ok) {
        setMessage({ type: "success", text: "Audit cycle closed and discrepancy report locked." });
        // Refresh cycles
        const cycleRes = await fetchAuditCycles();
        if (cycleRes.ok && cycleRes.data) {
          setCycles(cycleRes.data);
          const updated = cycleRes.data.find((c: any) => c.id === selectedCycleId);
          setSelectedCycle(updated || null);
        }
      } else {
        setMessage({ type: "error", text: res.error || "Failed to close audit cycle." });
      }
      setLoading(false);
    }
  };

  // Calculate progress
  const totalAssetsCount = inScopeAssets.length;
  const markedAssetsCount = inScopeAssets.filter((a) => getAssetMark(a.id) !== undefined).length;
  const missingCount = inScopeAssets.filter((a) => getAssetMark(a.id)?.mark === "missing").length;
  const damagedCount = inScopeAssets.filter((a) => getAssetMark(a.id)?.mark === "damaged").length;

  return (
    <div className="bg-fog text-on-surface font-body-sm min-h-screen flex">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar-width p-margin-main flex flex-col h-screen overflow-hidden gap-stack-md">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase font-semibold">Audit Portal</span>
              <span className="w-1 h-1 rounded-full bg-slate"></span>
              {selectedCycle && (
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">
                  {selectedCycle.status} Cycle
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <h2 className="text-headline-lg font-headline-lg font-bold text-ink">Asset Checklist</h2>
              {!loading && (
                <div className="relative">
                  <select
                    value={selectedCycleId}
                    onChange={(e) => setSelectedCycleId(e.target.value ? Number(e.target.value) : "")}
                    className="bg-panel border border-slate/20 rounded px-2.5 py-1 text-xs font-semibold text-ink focus:outline-none"
                  >
                    {cycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {selectedCycle && (
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                Timeline: {new Date(selectedCycle.start_date).toLocaleDateString()} - {new Date(selectedCycle.end_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-panel border border-slate/10 rounded px-4 py-2 flex items-center gap-2 shadow-sm">
              <span className="text-label-caps font-label-caps text-on-surface-variant">PROGRESS</span>
              <span className="text-body-lg font-body-lg font-bold text-ink">
                {markedAssetsCount} / {totalAssetsCount}
              </span>
            </div>
            {selectedCycle && selectedCycle.status === "open" && (
              <button
                onClick={handleCloseCycle}
                className="bg-ink text-on-primary px-4 py-2 rounded font-body-sm text-body-sm font-medium hover:bg-ink/90 transition-colors focus:outline-none"
              >
                Close Audit Cycle
              </button>
            )}
          </div>
        </header>

        {message && (
          <div
            className={`p-3 rounded border-l-4 font-body-sm text-body-sm shrink-0 ${
              message.type === "success"
                ? "bg-available/10 border-available text-available"
                : "bg-error-container border-error text-on-error-container"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto flex flex-col gap-stack-md pb-stack-lg">
              {/* Checklist Table */}
              <div className="bg-panel border border-slate/10 rounded-sm overflow-hidden relative shadow-sm">
                {/* Table Header */}
                <div className="grid grid-cols-[1.5fr_1.5fr_1.5fr_1.5fr] gap-4 items-center px-4 py-3 border-b border-slate/10 bg-surface/50 font-semibold text-slate uppercase text-xs">
                  <div>Asset Details</div>
                  <div>Expected Location</div>
                  <div>Verification Notes</div>
                  <div className="text-right">Action / Mark</div>
                </div>

                {/* Rows */}
                <div className="flex flex-col divide-y divide-slate/5">
                  {inScopeAssets.length === 0 ? (
                    <div className="py-12 text-center text-slate">No in-scope assets for this audit cycle.</div>
                  ) : (
                    inScopeAssets.map((asset) => {
                      const markObj = getAssetMark(asset.id);
                      const state = markObj?.mark || "pending";
                      
                      return (
                        <div
                          key={asset.id}
                          className={`grid grid-cols-[1.5fr_1.5fr_1.5fr_1.5fr] gap-4 items-center px-4 py-3 hover:bg-fog/30 transition-colors ${
                            state === "pending" ? "bg-fog/10" : ""
                          }`}
                        >
                          {/* Details */}
                          <div className="flex items-center gap-3">
                            <div className="asset-tag-corner bg-panel border border-slate/20 px-2 py-0.5 text-label-mono font-label-mono text-ink relative before:absolute before:top-0 before:left-0 before:w-1.5 before:h-1.5 before:bg-tag-line">
                              {asset.asset_tag}
                            </div>
                            <span className="text-body-sm font-medium text-ink truncate max-w-[120px]" title={asset.name}>
                              {asset.name}
                            </span>
                          </div>

                          {/* Location */}
                          <div>
                            <span className="text-label-mono font-label-mono text-on-surface-variant text-[12px]">{asset.location || "--"}</span>
                          </div>

                          {/* Notes input or display */}
                          <div>
                            {selectedCycle?.status === "open" && !markObj ? (
                              <input
                                type="text"
                                placeholder="Add discrepancy note..."
                                value={discrepancyNotes[asset.id] || ""}
                                onChange={(e) =>
                                  setDiscrepancyNotes((prev) => ({ ...prev, [asset.id]: e.target.value }))
                                }
                                className="bg-surface border border-slate/20 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-ink"
                              />
                            ) : (
                              <span className="text-xs text-on-surface-variant italic">{markObj?.notes || "--"}</span>
                            )}
                          </div>

                          {/* Verification State Actions */}
                          <div className="flex justify-end items-center gap-1.5">
                            {selectedCycle?.status === "open" && !markObj ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleMarkAsset(asset.id, "verified")}
                                  className="bg-available/10 text-available px-2 py-1 rounded text-[10px] font-bold hover:bg-available/20"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => handleMarkAsset(asset.id, "missing")}
                                  className="bg-blocked/10 text-blocked px-2 py-1 rounded text-[10px] font-bold hover:bg-blocked/20"
                                >
                                  Missing
                                </button>
                                <button
                                  onClick={() => handleMarkAsset(asset.id, "damaged")}
                                  className="bg-pending/10 text-pending px-2 py-1 rounded text-[10px] font-bold hover:bg-pending/20"
                                >
                                  Damaged
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    state === "verified"
                                      ? "bg-available"
                                      : state === "missing"
                                      ? "bg-blocked"
                                      : state === "damaged"
                                      ? "bg-pending"
                                      : "border border-slate"
                                  }`}
                                />
                                <span
                                  className={`text-body-sm font-semibold capitalize ${
                                    state === "verified"
                                      ? "text-available"
                                      : state === "missing"
                                      ? "text-blocked"
                                      : state === "damaged"
                                      ? "text-pending"
                                      : "text-slate"
                                  }`}
                                >
                                  {state}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Discrepancy Banner */}
              {(missingCount > 0 || damagedCount > 0) && (
                <div className="bg-panel border-l-4 border-blocked border-y border-r border-slate/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-start sm:items-center gap-3 relative z-10">
                    <span className="material-symbols-outlined text-blocked bg-blocked/10 p-1.5 rounded-full">warning</span>
                    <div>
                      <h4 className="text-body-sm font-semibold text-ink">
                        {missingCount + damagedCount} Discrepancies Flagged
                      </h4>
                      <p className="text-label-caps font-label-caps text-on-surface-variant mt-0.5">
                        {missingCount} missing and {damagedCount} damaged assets reported for this cycle.
                      </p>
                    </div>
                  </div>
                  {selectedCycle && selectedCycle.discrepancy_report && (
                    <div className="bg-surface p-2 rounded text-xs font-mono border border-slate/10 w-full max-h-24 overflow-y-auto mt-2">
                      <pre className="whitespace-pre-wrap">{selectedCycle.discrepancy_report}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
