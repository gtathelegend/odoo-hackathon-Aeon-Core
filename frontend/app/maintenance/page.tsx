"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { fetchMaintenanceRequests, fetchAssets, createMaintenanceRequest } from "../../lib/api";

interface MaintenanceCard {
  id: number;
  tag: string;
  issue: string;
  priority: string;
  time: string;
  color: string;
  tech: string | null;
  status: string;
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Request Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | "">("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, assetRes] = await Promise.all([
        fetchMaintenanceRequests(),
        fetchAssets(),
      ]);

      if (reqRes.ok && reqRes.data) setRequests(reqRes.data);
      if (assetRes.ok && assetRes.data) setAssets(assetRes.data);
    } catch (err) {
      console.error("Error loading maintenance data:", err);
    }
    setLoading(false);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      setFormMessage({ type: "error", text: "Please select an asset." });
      return;
    }
    if (description.length < 10 || description.length > 2000) {
      setFormMessage({ type: "error", text: "Description must be between 10 and 2000 characters." });
      return;
    }

    setSubmitting(true);
    setFormMessage(null);

    const payload = {
      asset_id: Number(selectedAssetId),
      priority: priority,
      issue_description: description,
    };

    const res = await createMaintenanceRequest(payload);
    if (res.ok) {
      setFormMessage({ type: "success", text: "Maintenance request raised successfully!" });
      setSelectedAssetId("");
      setDescription("");
      // Refresh requests list
      const reqRes = await fetchMaintenanceRequests();
      if (reqRes.ok && reqRes.data) setRequests(reqRes.data);
      setTimeout(() => {
        setShowModal(false);
        setFormMessage(null);
      }, 1500);
    } else {
      setFormMessage({ type: "error", text: res.error || "Failed to submit maintenance request." });
    }
    setSubmitting(false);
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "Z");
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  const getPriorityColor = (pri: string) => {
    switch (pri) {
      case "critical": return "border-l-blocked";
      case "high": return "border-l-pending";
      case "medium": return "border-l-allocated";
      default: return "border-l-slate";
    }
  };

  // Organize Kanban cards
  const kanbanColumns = [
    { title: "Pending", status: "pending" },
    { title: "Approved", status: "approved" },
    { title: "Tech Assigned", status: "technician_assigned" },
    { title: "In Progress", status: "in_progress" },
    { title: "Resolved", status: "resolved" },
  ];

  const getCardsByStatus = (status: string) => {
    return requests
      .filter((r) => r.status === status)
      .map((r) => ({
        id: r.id,
        tag: r.asset_id ? r.asset_id[1].split(" ")[0] : "Asset",
        issue: r.issue_description,
        priority: r.priority,
        time: formatTimeAgo(r.request_date),
        color: getPriorityColor(r.priority),
        tech: r.technician_id ? r.technician_id[1] : null,
        status: r.status,
      }));
  };

  return (
    <div className="bg-fog text-on-surface font-body-sm min-h-screen flex">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar-width p-margin-main flex flex-col h-screen overflow-hidden gap-stack-lg">
        {/* Header */}
        <header className="flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-headline-lg font-headline-lg text-ink font-semibold">Maintenance Management</h2>
            <p className="text-on-surface-variant text-body-sm font-body-sm mt-1">Approval workflow and repair tracking</p>
          </div>
          <div className="flex items-center gap-stack-md">
            <button
              onClick={() => setShowModal(true)}
              className="bg-ink text-on-primary px-4 py-2 rounded flex items-center gap-2 hover:bg-ink/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="text-label-caps font-label-caps uppercase">New Request</span>
            </button>
          </div>
        </header>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          {loading ? (
            <div className="h-full flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
            </div>
          ) : (
            <div className="flex gap-gutter h-full items-start min-w-[1000px]">
              {kanbanColumns.map((col) => {
                const cards = getCardsByStatus(col.status);
                return (
                  <div key={col.title} className="flex-1 flex flex-col h-full bg-surface-container-low rounded-lg border border-slate/10 overflow-hidden">
                    <div className="p-4 border-b border-slate/10 bg-surface flex justify-between items-center shrink-0">
                      <h3 className="text-label-caps font-label-caps text-ink uppercase font-semibold">{col.title}</h3>
                      <span className="bg-slate/10 text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-semibold">{cards.length}</span>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-hide">
                      {cards.length === 0 ? (
                        <div className="text-center py-8 text-slate text-xs italic">No requests</div>
                      ) : (
                        cards.map((card) => (
                          <div key={card.id} className={`bg-panel p-3 border border-slate/10 border-l-4 ${card.color} rounded shadow-sm cursor-pointer hover:border-slate/30 transition-colors group`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="asset-tag-kanban bg-surface-container px-2 py-1 inline-block">
                                <span className={`text-label-mono font-label-mono text-ink ${card.status === "resolved" ? "line-through decoration-slate" : ""}`}>{card.tag}</span>
                                <div className={`h-0.5 w-4 mt-1 group-hover:w-full transition-all duration-300 ${card.color.replace("border-l-", "bg-")}`} />
                              </div>
                              <span className="material-symbols-outlined text-slate text-[16px]">
                                {card.status === "resolved" ? "check_circle" : "more_horiz"}
                              </span>
                            </div>
                            <p className="text-body-sm font-body-sm text-ink font-medium mb-1 line-clamp-2">{card.issue}</p>
                            
                            <div className="mt-3 flex items-center justify-between text-[10px] text-on-surface-variant uppercase font-semibold tracking-wider">
                              <span className="capitalize">{card.priority} Priority</span>
                              <span>{card.time}</span>
                            </div>

                            {card.tech && (
                              <div className="mt-3 bg-surface-container p-2 rounded flex items-center gap-2 border border-slate/5">
                                <div className="w-5 h-5 rounded-full bg-allocated text-on-primary flex items-center justify-center text-[9px] font-bold">
                                  {card.tech.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <p className="text-[9px] font-semibold uppercase text-ink">Tech: {card.tech}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* New Request Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-panel border border-slate/10 rounded-lg max-w-md w-full shadow-lg p-6 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate hover:text-ink focus:outline-none"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="font-headline-md text-headline-md text-ink font-bold mb-4">Raise Maintenance Request</h3>
              
              {formMessage && (
                <div
                  className={`p-3 rounded border-l-4 font-body-sm text-body-sm mb-4 ${
                    formMessage.type === "success"
                      ? "bg-available/10 border-available text-available"
                      : "bg-error-container border-error text-on-error-container"
                  }`}
                >
                  {formMessage.text}
                </div>
              )}

              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Select Asset</label>
                  <div className="relative">
                    <select
                      value={selectedAssetId}
                      onChange={(e) => setSelectedAssetId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-surface border border-slate/35 rounded p-2 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none appearance-none"
                    >
                      <option value="">Choose asset...</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.asset_tag} — {a.name} ({a.state.replace("_", " ")})
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2 text-slate pointer-events-none text-[18px]">expand_more</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Priority</label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-surface border border-slate/35 rounded p-2 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none appearance-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2 text-slate pointer-events-none text-[18px]">expand_more</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate mb-1">Issue Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe the issue in detail (at least 10 characters)..."
                    className="w-full bg-surface border border-slate/35 rounded p-2 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ink text-on-primary py-2.5 rounded font-label-caps text-label-caps font-bold hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-ink disabled:opacity-55"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
