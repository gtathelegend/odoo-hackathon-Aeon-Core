"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { fetchAssets, fetchMaintenanceRequests, fetchBookings, fetchAllocations } from "../../lib/api";

interface UtilizationDept {
  name: string;
  usage: number;
  label: string;
}

interface HighUseItem {
  tag: string;
  name: string;
  metric: string;
  period: string;
}

interface AttentionItem {
  tag: string;
  name: string;
  issue: string;
  subtext?: string;
  type: "idle" | "maintenance" | "overdue";
}

export default function ReportsPage() {
  const [departments, setDepartments] = useState<UtilizationDept[]>([]);
  const [highUtilization, setHighUtilization] = useState<HighUseItem[]>([]);
  const [attentionRequired, setAttentionRequired] = useState<AttentionItem[]>([]);
  const [maintenanceMonths, setMaintenanceMonths] = useState<string[]>([]);
  const [svgPath, setSvgPath] = useState("M0,150 L400,150");
  const [svgAreaPath, setSvgAreaPath] = useState("M0,150 L400,150 L400,200 L0,200 Z");
  const [points, setPoints] = useState<{ cx: number; cy: number }[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [assetsRes, reqRes, bookingRes, allocRes] = await Promise.all([
        fetchAssets(),
        fetchMaintenanceRequests(),
        fetchBookings(),
        fetchAllocations(),
      ]);

      const allAssets = assetsRes.ok && assetsRes.data ? assetsRes.data : [];
      const allRequests = reqRes.ok && reqRes.data ? reqRes.data : [];
      const allBookings = bookingRes.ok && bookingRes.data ? bookingRes.data : [];
      const allAllocations = allocRes.ok && allocRes.data ? allocRes.data : [];

      // 1. Calculate Department Utilization
      // We group assets by department and calculate percentage of allocated assets.
      const deptStats: { [name: string]: { total: number; allocated: number } } = {};
      allAssets.forEach((asset) => {
        if (asset.department_id) {
          const deptName = asset.department_id[1];
          if (!deptStats[deptName]) {
            deptStats[deptName] = { total: 0, allocated: 0 };
          }
          deptStats[deptName].total += 1;
          if (asset.state === "allocated" || asset.state === "reserved") {
            deptStats[deptName].allocated += 1;
          }
        }
      });

      const deptsArray: UtilizationDept[] = Object.keys(deptStats).map((name) => {
        const stats = deptStats[name];
        const usage = stats.total > 0 ? Math.round((stats.allocated / stats.total) * 100) : 0;
        // Use first 3 letters for chart abbreviation
        const code = name.substring(0, 3).toUpperCase();
        return { name: code, usage: Math.max(usage, 5), label: name }; // min 5% for visual representation
      });

      // Default fallback if no departments found in live database yet
      if (deptsArray.length === 0) {
        setDepartments([
          { name: "ENG", usage: 80, label: "Engineering" },
          { name: "FAC", usage: 40, label: "Facilities" },
          { name: "OPS", usage: 60, label: "Operations" },
          { name: "IT", usage: 90, label: "IT" },
          { name: "HR", usage: 25, label: "Human Resources" },
        ]);
      } else {
        setDepartments(deptsArray.slice(0, 5));
      }

      // 2. Calculate Maintenance Trends (last 6 months)
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const last6Months: string[] = [];
      const monthCounts: number[] = [0, 0, 0, 0, 0, 0];
      
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        last6Months.push(monthNames[d.getMonth()]);
      }
      setMaintenanceMonths(last6Months);

      allRequests.forEach((req) => {
        if (req.request_date) {
          const reqDate = new Date(req.request_date);
          const diffMonths = (today.getFullYear() - reqDate.getFullYear()) * 12 + (today.getMonth() - reqDate.getMonth());
          if (diffMonths >= 0 && diffMonths < 6) {
            monthCounts[5 - diffMonths] += 1;
          }
        }
      });

      // Map monthly request counts to SVG path (viewBox is 400x200)
      // X coordinates spaced evenly: 0, 80, 160, 240, 320, 400
      const maxCount = Math.max(...monthCounts, 1);
      const pointsArray = monthCounts.map((count, idx) => {
        const cx = idx * 80;
        // Map count to Y: max count is at Y=20, 0 count is at Y=180
        const cy = 180 - (count / maxCount) * 150;
        return { cx, cy };
      });
      setPoints(pointsArray.filter((_, idx) => idx === 1 || idx === 3 || idx === 5)); // circles on a few points

      let pathStr = `M${pointsArray[0].cx},${pointsArray[0].cy}`;
      for (let i = 1; i < pointsArray.length; i++) {
        pathStr += ` L${pointsArray[i].cx},${pointsArray[i].cy}`;
      }
      setSvgPath(pathStr);

      const areaStr = `${pathStr} L400,200 L0,200 Z`;
      setSvgAreaPath(areaStr);

      // 3. High Utilization List: Count bookings per asset
      const bookingCounts: { [assetTag: string]: { name: string; count: number } } = {};
      allBookings.forEach((b) => {
        if (b.asset_id) {
          const tag = b.asset_id[1].split(" ")[0];
          const name = b.asset_id[1].substring(tag.length + 1) || "Resource";
          if (!bookingCounts[tag]) {
            bookingCounts[tag] = { name, count: 0 };
          }
          bookingCounts[tag].count += 1;
        }
      });

      const highUseArray: HighUseItem[] = Object.keys(bookingCounts)
        .map((tag) => ({
          tag,
          name: bookingCounts[tag].name,
          metric: `${bookingCounts[tag].count} booking${bookingCounts[tag].count > 1 ? "s" : ""}`,
          period: "this month",
          count: bookingCounts[tag].count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      if (highUseArray.length === 0) {
        setHighUtilization([
          { tag: "Room B2", name: "Conference Room B2", metric: "12 bookings", period: "this month" },
          { tag: "AF-0012", name: "Dell Laptop XPS", metric: "8 bookings", period: "this month" },
          { tag: "AF-0062", name: "HD Projector", metric: "5 bookings", period: "this month" },
        ]);
      } else {
        setHighUtilization(highUseArray);
      }

      // 4. Attention Required List
      const attentionArray: AttentionItem[] = [];
      
      // Find overdue allocations
      allAllocations.forEach((alloc) => {
        if (alloc.status === "overdue" && alloc.asset_id) {
          const tag = alloc.asset_id[1].split(" ")[0];
          const name = alloc.asset_id[1].substring(tag.length + 1) || "Asset";
          attentionArray.push({
            tag,
            name,
            issue: "Overdue Return",
            subtext: "High Priority",
            type: "overdue",
          });
        }
      });

      // Find assets under maintenance
      allAssets.forEach((asset) => {
        if (asset.state === "under_maintenance") {
          attentionArray.push({
            tag: asset.asset_tag,
            name: asset.name,
            issue: "In Maintenance",
            type: "maintenance",
          });
        }
      });

      // Default fallback
      if (attentionArray.length === 0) {
        setAttentionRequired([
          { tag: "AF-0301", name: "DSLR Camera", issue: "Unused 60+ days", type: "idle" },
          { tag: "AF-0087", name: "Forklift Heavy", issue: "Service due in 5 days", subtext: "High Priority", type: "maintenance" },
        ]);
      } else {
        setAttentionRequired(attentionArray.slice(0, 3));
      }

    } catch (err) {
      console.error("Error loading report metrics:", err);
    }
    setLoading(false);
  };

  return (
    <div className="bg-fog text-on-surface font-body-sm min-h-screen flex">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar-width flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="px-margin-main py-stack-lg flex justify-between items-end border-b border-slate/10 bg-fog shrink-0">
          <div>
            <h2 className="text-headline-lg md:font-headline-lg font-headline-lg-mobile text-ink font-bold">Reports & Analytics</h2>
            <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">System-wide asset utilization and lifecycle metrics</p>
          </div>
          <button className="bg-ink text-on-primary px-4 py-2 rounded flex items-center gap-2 hover:bg-inverse-surface transition-colors focus:outline-none">
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span className="text-label-caps font-label-caps tracking-wider">Export Report</span>
          </button>
        </header>

        {/* Scrollable Content Canvas */}
        <div className="flex-1 overflow-y-auto p-margin-main">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter max-w-7xl mx-auto pb-stack-lg">
              {/* Utilization Chart Panel */}
              <section className="bg-panel rounded border border-slate/10 p-6 flex flex-col shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-headline-md font-headline-md text-ink font-semibold">Utilization by Department</h3>
                  <span className="material-symbols-outlined text-outline">bar_chart</span>
                </div>
                <div className="flex-1 min-h-[240px] flex items-end justify-around gap-2 relative pb-8 border-b border-slate/20">
                  {/* Y-axis lines */}
                  <div className="absolute inset-x-0 bottom-[20%] border-t border-slate/5 border-dashed w-full -z-10"></div>
                  <div className="absolute inset-x-0 bottom-[40%] border-t border-slate/5 border-dashed w-full -z-10"></div>
                  <div className="absolute inset-x-0 bottom-[60%] border-t border-slate/5 border-dashed w-full -z-10"></div>
                  <div className="absolute inset-x-0 bottom-[80%] border-t border-slate/5 border-dashed w-full -z-10"></div>
                  {/* Bars */}
                  {departments.map((dept) => (
                    <div key={dept.name} className="w-12 bg-allocated rounded-t-sm flex flex-col justify-end group relative cursor-pointer hover:opacity-90 transition-opacity" style={{ height: `${dept.usage}%` }}>
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-label-caps font-label-caps text-on-surface-variant font-medium">{dept.name}</span>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-on-primary text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none z-20">
                        {dept.usage}% Usage
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Maintenance Trend Panel */}
              <section className="bg-panel rounded border border-slate/10 p-6 flex flex-col shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-headline-md font-headline-md text-ink font-semibold">Maintenance Frequency</h3>
                  <span className="material-symbols-outlined text-outline">timeline</span>
                </div>
                <div className="flex-1 min-h-[240px] relative border-b border-slate/20 pb-8 overflow-hidden">
                  {/* Y-axis lines */}
                  <div className="absolute inset-x-0 bottom-[20%] border-t border-slate/5 border-dashed w-full -z-10"></div>
                  <div className="absolute inset-x-0 bottom-[40%] border-t border-slate/5 border-dashed w-full -z-10"></div>
                  <div className="absolute inset-x-0 bottom-[60%] border-t border-slate/5 border-dashed w-full -z-10"></div>
                  <div className="absolute inset-x-0 bottom-[80%] border-t border-slate/5 border-dashed w-full -z-10"></div>
                  {/* SVG Line Chart */}
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 200">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#B23B2E" stopOpacity="0.2"></stop>
                        <stop offset="100%" stopColor="#B23B2E" stopOpacity="0"></stop>
                      </linearGradient>
                    </defs>
                    <path className="opacity-70" d={svgPath} fill="none" stroke="#B23B2E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
                    <path d={svgAreaPath} fill="url(#lineGrad)"></path>
                    {points.map((pt, idx) => (
                      <circle key={idx} cx={pt.cx} cy={pt.cy} fill="#FFFFFF" r="4" stroke="#B23B2E" strokeWidth="2"></circle>
                    ))}
                  </svg>
                  {/* X-axis labels */}
                  <div className="absolute bottom-0 w-full flex justify-between text-label-caps font-label-caps text-on-surface-variant px-2 font-medium">
                    {maintenanceMonths.map((m, idx) => (
                      <span key={idx}>{m}</span>
                    ))}
                  </div>
                </div>
              </section>

              {/* Insights Row */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-gutter mt-4">
                {/* Most Used Assets */}
                <section className="bg-panel rounded border border-slate/10 p-5 shadow-sm">
                  <h4 className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-4 tracking-wide font-semibold">High Utilization List</h4>
                  <div className="space-y-3">
                    {highUtilization.map((item, idx) => (
                      <div key={item.tag}>
                        <div className="flex justify-between items-start group">
                          <div>
                            <div className="relative inline-block asset-tag-corner bg-fog border border-slate/10 px-3 py-1 mb-1 before:absolute before:top-0 before:left-0 before:w-1.5 before:h-1.5 before:bg-tag-line">
                              <span className="text-label-mono font-label-mono text-ink tracking-tight font-medium">{item.tag}</span>
                              <div className="absolute bottom-0 left-0 h-[2px] bg-allocated w-full transition-all group-hover:h-full group-hover:opacity-10 -z-10"></div>
                            </div>
                            <p className="text-body-sm font-body-sm text-on-surface-variant">{item.name}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-headline-md font-headline-md text-ink block font-semibold">{item.metric}</span>
                            <span className="text-label-caps font-label-caps text-available font-semibold">{item.period}</span>
                          </div>
                        </div>
                        {idx < highUtilization.length - 1 && <hr className="border-slate/10 my-2" />}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Idle / Attention Assets */}
                <section className="bg-panel rounded border border-slate/10 p-5 shadow-sm border-l-4 border-l-pending">
                  <h4 className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-4 tracking-wide font-semibold">Attention Required</h4>
                  <div className="space-y-3">
                    {attentionRequired.map((item, idx) => (
                      <div key={item.tag}>
                        <div className="flex justify-between items-start group">
                          <div>
                            <div className="relative inline-block asset-tag-corner bg-fog border border-slate/10 px-3 py-1 mb-1 before:absolute before:top-0 before:left-0 before:w-1.5 before:h-1.5 before:bg-tag-line">
                              <span className="text-label-mono font-label-mono text-ink tracking-tight font-medium">{item.tag}</span>
                              <div className={`absolute bottom-0 left-0 h-[2px] ${item.type === "overdue" ? "bg-blocked" : "bg-pending"} w-full transition-all group-hover:h-full group-hover:opacity-10 -z-10`}></div>
                            </div>
                            <p className="text-body-sm font-body-sm text-on-surface-variant">{item.name}</p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            {item.type === "idle" ? (
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-pending">timer</span>
                                <span className="text-body-sm font-body-sm text-ink">{item.issue}</span>
                              </div>
                            ) : (
                              <>
                                <span className={`text-body-sm font-body-sm font-semibold ${item.type === "overdue" ? "text-blocked" : "text-pending"}`}>
                                  {item.issue}
                                </span>
                                {item.subtext && (
                                  <span className="text-label-caps font-label-caps text-on-surface-variant mt-1">{item.subtext}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {idx < attentionRequired.length - 1 && <hr className="border-slate/10 my-2" />}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
