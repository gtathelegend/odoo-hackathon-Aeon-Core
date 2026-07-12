"use client";
import { useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { apiClient } from "../../lib/api-client";

type ReportType = "assets" | "allocations" | "maintenance" | "bookings" | "audits";

interface ReportMeta {
  type: ReportType;
  label: string;
  icon: string;
  description: string;
}

const REPORTS: ReportMeta[] = [
  { type: "assets", label: "Asset Inventory", icon: "inventory_2", description: "Full asset inventory with status, condition, value, and location" },
  { type: "allocations", label: "Allocation Report", icon: "swap_horiz", description: "All allocations with employee, dates, and return status" },
  { type: "maintenance", label: "Maintenance Report", icon: "build", description: "Maintenance requests by priority, status, and resolution" },
  { type: "bookings", label: "Booking Report", icon: "event_available", description: "Resource bookings with utilization and time slots" },
  { type: "audits", label: "Audit Report", icon: "fact_check", description: "Audit cycles, verification records, and discrepancies" },
];

interface ReportResult {
  type: string;
  rowCount: number;
  generatedAt: string;
  rows: Record<string, unknown>[];
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateReport(type: ReportType) {
    setSelectedReport(type);
    setLoading(true);
    setReportData(null);
    setError(null);
    try {
      const data = await apiClient.post<ReportResult>("/reports/run", { type });
      setReportData(data);
    } catch (e) {
      setError((e as Error).message || "Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(format: "csv" | "json") {
    if (!selectedReport) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/reports/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: selectedReport, format }),
        },
      );
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport}_report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    }
  }

  // Get column headers from first row
  const columns = reportData?.rows?.[0] ? Object.keys(flattenRow(reportData.rows[0])) : [];

  function flattenRow(row: Record<string, unknown>, prefix = ""): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.assign(result, flattenRow(value as Record<string, unknown>, fullKey));
      } else {
        result[fullKey] = value == null ? "—" : String(value);
      }
    }
    return result;
  }

  return (
    <AuthGuard>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <main className="md:ml-sidebar-width flex-1 flex flex-col">
          <header className="bg-surface border-b border-slate/10 h-16 px-gutter flex justify-between items-center sticky top-0 z-40">
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Reports</h2>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            {/* Report cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-stack-lg">
              {REPORTS.map((report) => (
                <button
                  key={report.type}
                  onClick={() => generateReport(report.type)}
                  disabled={loading}
                  className={`bg-panel p-6 rounded-lg border text-left transition-all hover:shadow-md disabled:opacity-60 ${
                    selectedReport === report.type ? "border-ink ring-2 ring-ink/10" : "border-slate/10 hover:border-slate/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-[24px] text-ink">{report.icon}</span>
                    <h3 className="font-headline-md text-headline-md text-ink">{report.label}</h3>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{report.description}</p>
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="bg-blocked/10 border border-blocked/20 rounded-lg p-4 mb-4">
                <p className="text-body-sm text-blocked">{error}</p>
              </div>
            )}

            {/* Report output */}
            {reportData && !loading && (
              <div className="bg-panel rounded-lg border border-slate/10 overflow-hidden">
                {/* Summary header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10 bg-fog/50">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-ink">
                      {REPORTS.find((r) => r.type === selectedReport)?.label ?? "Report"}
                    </h3>
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      {reportData.rowCount} records • Generated {new Date(reportData.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportReport("csv")}
                      className="px-4 py-2 rounded-lg border border-slate/20 text-body-sm font-medium hover:bg-surface transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      CSV
                    </button>
                    <button
                      onClick={() => exportReport("json")}
                      className="px-4 py-2 rounded-lg border border-slate/20 text-body-sm font-medium hover:bg-surface transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      JSON
                    </button>
                  </div>
                </div>

                {/* Data table */}
                {reportData.rowCount === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">table_chart</span>
                    <p className="text-body-sm">No data for this report</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-body-sm">
                      <thead className="sticky top-0 bg-fog/90 backdrop-blur-sm">
                        <tr className="border-b border-slate/10">
                          {columns.slice(0, 8).map((col) => (
                            <th key={col} className="text-left px-4 py-2 font-label-caps text-label-caps uppercase text-on-surface-variant whitespace-nowrap">
                              {col.replace(/\./g, " › ")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate/5">
                        {reportData.rows.slice(0, 50).map((row, i) => {
                          const flat = flattenRow(row);
                          return (
                            <tr key={i} className="hover:bg-fog/30 transition-colors">
                              {columns.slice(0, 8).map((col) => (
                                <td key={col} className="px-4 py-2 text-on-surface-variant whitespace-nowrap max-w-[200px] truncate">
                                  {flat[col] ?? "—"}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {reportData.rowCount > 50 && (
                      <div className="px-6 py-3 text-center text-body-sm text-on-surface-variant border-t border-slate/10">
                        Showing 50 of {reportData.rowCount} rows. Export for full data.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
