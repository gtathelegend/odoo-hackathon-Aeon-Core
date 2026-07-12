"use client";
import { useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { apiClient } from "../../lib/api-client";

type ReportType = "utilization" | "maintenance-frequency" | "department-allocation" | "booking-heatmap" | "assets-due-retirement";

interface ReportMeta {
  type: ReportType;
  label: string;
  icon: string;
  description: string;
}

const REPORTS: ReportMeta[] = [
  { type: "utilization", label: "Asset Utilization", icon: "analytics", description: "Utilization rates across asset categories and departments" },
  { type: "maintenance-frequency", label: "Maintenance Frequency", icon: "build", description: "Frequency and cost of maintenance by asset and category" },
  { type: "department-allocation", label: "Dept. Allocation Summary", icon: "groups", description: "Allocation distribution across departments" },
  { type: "booking-heatmap", label: "Booking Heatmap", icon: "calendar_month", description: "Peak booking times and resource demand patterns" },
  { type: "assets-due-retirement", label: "Assets Due for Retirement", icon: "event_busy", description: "Assets approaching end of useful life" },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateReport(type: ReportType) {
    setSelectedReport(type);
    setLoading(true);
    setReportData(null);
    try {
      const data = await apiClient.get<Record<string, unknown>>(`/reports/${type}`);
      setReportData(data);
    } catch {
      setReportData({ error: "Failed to generate report. Please try again." });
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
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Reports</h2>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            {/* Report cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-stack-lg">
              {REPORTS.map((report) => (
                <button
                  key={report.type}
                  onClick={() => generateReport(report.type)}
                  className={`bg-panel p-6 rounded-lg border text-left transition-all hover:shadow-md ${
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

            {/* Report output */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            )}

            {reportData && !loading && (
              <div className="bg-panel rounded-lg border border-slate/10 p-6">
                <h3 className="font-headline-md text-headline-md text-ink mb-4">
                  {REPORTS.find((r) => r.type === selectedReport)?.label ?? "Report"}
                </h3>
                <pre className="text-body-sm text-on-surface-variant whitespace-pre-wrap bg-fog rounded-lg p-4 overflow-auto max-h-[500px]">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
