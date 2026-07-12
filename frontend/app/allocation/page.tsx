"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import {
  fetchAssets,
  fetchEmployees,
  fetchDepartments,
  fetchAllocations,
  createAllocation,
  createTransfer,
} from "../../lib/api";

export default function AllocationPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  
  const [selectedAssetId, setSelectedAssetId] = useState<number | "">("");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [activeAllocForAsset, setActiveAllocForAsset] = useState<any>(null);

  // New Allocation Form
  const [holderType, setHolderType] = useState<"employee" | "department">("employee");
  const [targetEmployeeId, setTargetEmployeeId] = useState<number | "">("");
  const [targetDeptId, setTargetDeptId] = useState<number | "">("");
  const [expectedReturn, setExpectedReturn] = useState("");

  // Transfer Form
  const [transferToEmployeeId, setTransferToEmployeeId] = useState<number | "">("");
  const [transferReason, setTransferReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedAssetId) {
      const asset = assets.find((a) => a.id === selectedAssetId);
      setSelectedAsset(asset || null);
      
      // Find active allocation for this asset
      const active = allocations.find(
        (a) => a.asset_id && a.asset_id[0] === selectedAssetId && ["active", "overdue", "pending_reassignment"].includes(a.status)
      );
      setActiveAllocForAsset(active || null);
    } else {
      setSelectedAsset(null);
      setActiveAllocForAsset(null);
    }
  }, [selectedAssetId, assets, allocations]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [assetsRes, empRes, deptRes, allocRes] = await Promise.all([
        fetchAssets(),
        fetchEmployees(),
        fetchDepartments(),
        fetchAllocations(),
      ]);

      if (assetsRes.ok && assetsRes.data) setAssets(assetsRes.data);
      if (empRes.ok && empRes.data) setEmployees(empRes.data.filter((e: any) => e.active));
      if (deptRes.ok && deptRes.data) setDepartments(deptRes.data);
      if (allocRes.ok && allocRes.data) setAllocations(allocRes.data);
    } catch (err) {
      console.error("Error loading allocation data:", err);
    }
    setLoading(false);
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;
    
    setMessage(null);
    const payload: any = {
      asset_id: selectedAssetId,
      holder_type: holderType,
    };
    if (holderType === "employee") {
      if (!targetEmployeeId) {
        setMessage({ type: "error", text: "Please select an employee." });
        return;
      }
      payload.employee_id = Number(targetEmployeeId);
    } else {
      if (!targetDeptId) {
        setMessage({ type: "error", text: "Please select a department." });
        return;
      }
      payload.department_id = Number(targetDeptId);
    }
    if (expectedReturn) {
      payload.expected_return_date = expectedReturn;
    }

    const res = await createAllocation(payload);
    if (res.ok) {
      setMessage({ type: "success", text: "Asset allocated successfully!" });
      // Refresh allocation history
      const freshAllocs = await fetchAllocations();
      if (freshAllocs.ok && freshAllocs.data) setAllocations(freshAllocs.data);
      // Reset form
      setTargetEmployeeId("");
      setTargetDeptId("");
      setExpectedReturn("");
      // Reload assets (since state changed to allocated)
      const freshAssets = await fetchAssets();
      if (freshAssets.ok && freshAssets.data) setAssets(freshAssets.data);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create allocation." });
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !activeAllocForAsset) return;

    if (!transferToEmployeeId) {
      setMessage({ type: "error", text: "Please select a recipient employee." });
      return;
    }
    if (!transferReason.trim()) {
      setMessage({ type: "error", text: "Please provide a reason for transfer." });
      return;
    }
    if (!activeAllocForAsset.employee_id) {
      setMessage({ type: "error", text: "Current allocation is department-based. Transfer requests are for employee-held assets." });
      return;
    }

    setMessage(null);
    const payload = {
      asset_id: selectedAssetId,
      current_holder_id: activeAllocForAsset.employee_id[0],
      requested_holder_id: Number(transferToEmployeeId),
      reason: transferReason,
    };

    const res = await createTransfer(payload);
    if (res.ok) {
      setMessage({ type: "success", text: "Transfer request submitted successfully!" });
      setTransferToEmployeeId("");
      setTransferReason("");
      // Refresh allocations and assets
      const [freshAllocs, freshAssets] = await Promise.all([fetchAllocations(), fetchAssets()]);
      if (freshAllocs.ok && freshAllocs.data) setAllocations(freshAllocs.data);
      if (freshAssets.ok && freshAssets.data) setAssets(freshAssets.data);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to submit transfer request." });
    }
  };

  // Filter allocation history list for the selected asset
  const assetHistory = allocations.filter((a) => a.asset_id && a.asset_id[0] === selectedAssetId);

  return (
    <div className="bg-fog min-h-screen flex">
      <Sidebar />
      <main className="md:ml-sidebar-width flex-1 flex flex-col min-h-screen">
        <div className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6">
          {/* Header */}
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink mb-1">Asset Allocation & Transfer</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Process transfer requests or create new asset allocations.</p>
          </div>

          {/* Select Asset */}
          <div className="bg-panel rounded-lg border border-slate/10 p-6 shadow-sm">
            <label className="block font-label-caps text-label-caps text-ink mb-2 font-semibold">Select Asset</label>
            {loading ? (
              <div className="animate-pulse h-10 bg-fog rounded" />
            ) : (
              <div className="relative">
                <select
                  value={selectedAssetId}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value ? Number(e.target.value) : "");
                    setMessage(null);
                  }}
                  className="w-full bg-panel border border-slate/30 rounded p-2.5 font-body-sm text-ink appearance-none focus:ring-2 focus:ring-ink focus:border-transparent focus:outline-none"
                >
                  <option value="">Choose an asset...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_tag} — {a.name} ({a.state.replace("_", " ")})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate">expand_more</span>
              </div>
            )}
          </div>

          {message && (
            <div
              className={`p-4 rounded border-l-4 font-body-sm text-body-sm ${
                message.type === "success"
                  ? "bg-available/10 border-available text-available"
                  : "bg-error-container border-error text-on-error-container"
              }`}
            >
              {message.text}
            </div>
          )}

          {selectedAsset && (
            <div className="bg-panel rounded-lg border border-slate/10 p-6 shadow-sm flex flex-col gap-6">
              {/* Asset Info Card */}
              <div className="pb-6 border-b border-slate/10">
                <label className="block font-label-caps text-label-caps text-slate mb-2">Asset Details</label>
                <div className="flex items-center gap-4">
                  <div className="tag-notched bg-surface border border-slate/20 px-4 py-2 relative text-ink">
                    <div className="absolute bottom-0 left-0 h-[2px] w-full bg-allocated" />
                    <span className="font-label-mono text-label-mono font-medium">{selectedAsset.asset_tag}</span>
                  </div>
                  <div>
                    <p className="font-headline-md text-headline-md font-semibold text-ink">{selectedAsset.name}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      SN: {selectedAsset.serial_number || "N/A"} • Location: {selectedAsset.location || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conflict State (Allocated / Reserved) */}
              {activeAllocForAsset ? (
                <div>
                  {/* Conflict Notice */}
                  <div className="bg-panel border-l-4 border-blocked border-y border-r border-slate/10 p-4 rounded-r shadow-sm relative overflow-hidden mb-6">
                    <div className="absolute top-0 right-0 p-2 text-blocked/10 pointer-events-none">
                      <span className="material-symbols-outlined text-4xl">warning</span>
                    </div>
                    <h3 className="font-label-caps text-label-caps text-blocked font-bold mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">block</span> Allocation Conflict
                    </h3>
                    <p className="font-body-sm text-body-sm text-ink mb-4">
                      Asset is currently allocated to{" "}
                      <strong>
                        {activeAllocForAsset.employee_id ? activeAllocForAsset.employee_id[1] : activeAllocForAsset.department_id[1]}
                      </strong>
                      . Direct allocation is blocked. Submit a transfer request below.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-fog/50 p-3 rounded">
                      <div>
                        <span className="block font-label-caps text-label-caps text-slate mb-1">Current Holder</span>
                        <span className="font-body-sm text-body-sm font-medium">
                          {activeAllocForAsset.employee_id ? activeAllocForAsset.employee_id[1] : activeAllocForAsset.department_id[1]}
                        </span>
                      </div>
                      <div>
                        <span className="block font-label-caps text-label-caps text-slate mb-1">Holder Type</span>
                        <span className="font-body-sm text-body-sm font-medium capitalize">{activeAllocForAsset.status}</span>
                      </div>
                      <div>
                        <span className="block font-label-caps text-label-caps text-slate mb-1">Assigned Date</span>
                        <span className="font-body-sm text-body-sm font-medium">
                          {new Date(activeAllocForAsset.allocation_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="block font-label-caps text-label-caps text-slate mb-1">Expected Return</span>
                        <span className="font-body-sm text-body-sm font-medium">
                          {activeAllocForAsset.expected_return_date ? new Date(activeAllocForAsset.expected_return_date).toLocaleDateString() : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Form */}
                  <form onSubmit={handleCreateTransfer}>
                    <h3 className="font-label-caps text-label-caps text-ink font-semibold mb-4">Transfer Asset</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block font-label-caps text-label-caps text-slate mb-stack-sm">From</label>
                        <input
                          className="w-full bg-fog border border-slate/20 rounded p-2.5 font-body-sm text-on-surface-variant cursor-not-allowed"
                          disabled
                          type="text"
                          value={activeAllocForAsset.employee_id ? activeAllocForAsset.employee_id[1] : activeAllocForAsset.department_id[1]}
                        />
                      </div>
                      <div>
                        <label className="block font-label-caps text-label-caps text-ink mb-stack-sm font-semibold">To (Select Employee)</label>
                        <div className="relative">
                          <select
                            value={transferToEmployeeId}
                            onChange={(e) => setTransferToEmployeeId(e.target.value ? Number(e.target.value) : "")}
                            className="w-full bg-panel border border-slate/30 rounded p-2.5 font-body-sm text-ink appearance-none focus:ring-2 focus:ring-ink focus:border-transparent focus:outline-none"
                          >
                            <option value="">Select recipient...</option>
                            {employees
                              .filter((emp) => !activeAllocForAsset.employee_id || emp.id !== activeAllocForAsset.employee_id[0])
                              .map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name} {emp.department_id ? `(${emp.department_id[1]})` : ""}
                                </option>
                              ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate">expand_more</span>
                        </div>
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="block font-label-caps text-label-caps text-ink mb-stack-sm font-semibold">Reason for Transfer</label>
                      <textarea
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        className="w-full bg-panel border border-slate/30 rounded p-2.5 font-body-sm text-ink resize-none focus:ring-2 focus:ring-ink focus:border-transparent focus:outline-none"
                        placeholder="Provide justification for this transfer request..."
                        rows={4}
                      />
                    </div>
                    <button
                      className="bg-ink text-on-primary px-6 py-2.5 rounded font-label-caps text-label-caps font-bold hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink"
                      type="submit"
                    >
                      Submit Transfer Request
                    </button>
                  </form>
                </div>
              ) : (
                /* Available State -> New Allocation Form */
                <form onSubmit={handleCreateAllocation}>
                  <h3 className="font-label-caps text-label-caps text-ink font-semibold mb-4">New Allocation Request</h3>
                  
                  <div className="mb-6">
                    <label className="block font-label-caps text-label-caps text-slate mb-stack-sm">Holder Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-body-sm text-ink">
                        <input
                          type="radio"
                          name="holder_type"
                          checked={holderType === "employee"}
                          onChange={() => setHolderType("employee")}
                          className="text-ink focus:ring-ink"
                        />
                        Employee
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-body-sm text-ink">
                        <input
                          type="radio"
                          name="holder_type"
                          checked={holderType === "department"}
                          onChange={() => setHolderType("department")}
                          className="text-ink focus:ring-ink"
                        />
                        Department
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {holderType === "employee" ? (
                      <div>
                        <label className="block font-label-caps text-label-caps text-ink mb-stack-sm font-semibold">Allocate to (Employee)</label>
                        <div className="relative">
                          <select
                            value={targetEmployeeId}
                            onChange={(e) => setTargetEmployeeId(e.target.value ? Number(e.target.value) : "")}
                            className="w-full bg-panel border border-slate/30 rounded p-2.5 font-body-sm text-ink appearance-none focus:ring-2 focus:ring-ink focus:border-transparent focus:outline-none"
                          >
                            <option value="">Select employee...</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} {emp.department_id ? `(${emp.department_id[1]})` : ""}
                              </option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate">expand_more</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block font-label-caps text-label-caps text-ink mb-stack-sm font-semibold">Allocate to (Department)</label>
                        <div className="relative">
                          <select
                            value={targetDeptId}
                            onChange={(e) => setTargetDeptId(e.target.value ? Number(e.target.value) : "")}
                            className="w-full bg-panel border border-slate/30 rounded p-2.5 font-body-sm text-ink appearance-none focus:ring-2 focus:ring-ink focus:border-transparent focus:outline-none"
                          >
                            <option value="">Select department...</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate">expand_more</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block font-label-caps text-label-caps text-ink mb-stack-sm font-semibold">Expected Return Date</label>
                      <input
                        type="date"
                        value={expectedReturn}
                        onChange={(e) => setExpectedReturn(e.target.value)}
                        className="w-full bg-panel border border-slate/30 rounded p-2 text-body-sm text-ink focus:ring-2 focus:ring-ink focus:border-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    className="bg-ink text-on-primary px-6 py-2.5 rounded font-label-caps text-label-caps font-bold hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-ink"
                    type="submit"
                  >
                    Allocate Asset
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Allocation History */}
          {selectedAssetId && (
            <div className="bg-panel rounded-lg border border-slate/10 p-6 shadow-sm">
              <h3 className="font-label-caps text-label-caps text-slate mb-6">Allocation History</h3>
              {assetHistory.length === 0 ? (
                <p className="text-body-sm text-slate italic">No allocation history for this asset.</p>
              ) : (
                <div className="relative border-l-2 border-slate/20 ml-3 space-y-6">
                  {assetHistory.map((hist, idx) => {
                    const activeState = ["active", "overdue", "pending_reassignment"].includes(hist.status);
                    const color = activeState ? "allocated" : "available";
                    return (
                      <div key={hist.id || idx} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-${color} border-2 border-panel`} />
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-body-sm text-body-sm font-medium text-ink">
                            {hist.employee_id ? `Held by ${hist.employee_id[1]}` : `Held by Department: ${hist.department_id[1]}`}
                          </p>
                          <span className="font-label-mono text-[10px] text-slate">
                            {new Date(hist.allocation_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-body-sm text-[12px] text-on-surface-variant capitalize">
                          Status: {hist.status.replace("_", " ")}
                          {hist.expected_return_date && ` • Expected Return: ${new Date(hist.expected_return_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
