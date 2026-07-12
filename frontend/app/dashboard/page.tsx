import Sidebar from "../../components/sidebar";
import Link from "next/link";
import { AuthGuard } from "../../components/auth-guard";

const kpis = [
  { label: "Available", value: "128", color: "text-available", icon: "inventory_2", accent: "" },
  { label: "Allocated", value: "76",  color: "text-allocated", icon: "person_check", accent: "" },
  { label: "Maintenance Today", value: "4", color: "text-pending", icon: "build", accent: "border-l-4 border-l-pending" },
  { label: "Active Bookings", value: "9", color: "text-ink", icon: "event", accent: "" },
  { label: "Pending Transfers", value: "3", color: "text-ink", icon: "sync_alt", accent: "" },
  { label: "Upcoming Returns", value: "12", color: "text-ink", icon: "keyboard_return", accent: "" },
];

const activities = [
  { icon: "person_check", iconBg: "bg-allocated/10 border-allocated/20", iconColor: "text-allocated", text: <><span className="font-semibold text-ink">Laptop</span> allocated to <span className="font-medium text-ink">Priya Shah</span></>, sub: "IT Dept", tag: "AF-0114", tagColor: "bg-allocated", time: "10m ago" },
  { icon: "event_available", iconBg: "bg-ink/5 border-slate/20", iconColor: "text-ink", text: <><span className="font-semibold text-ink">Room B2</span> booking confirmed</>, sub: "2:00 PM to 3:00 PM", tag: null, tagColor: "", time: "45m ago" },
  { icon: "build_circle", iconBg: "bg-available/10 border-available/20", iconColor: "text-available", text: <><span className="font-semibold text-ink">Projector</span> maintenance resolved</>, sub: "Ready for use", tag: "AF-0062", tagColor: "bg-available", time: "2h ago" },
];

export default function DashboardPage() {
  return (
    <AuthGuard>
    <div className="bg-fog min-h-screen flex">
      <Sidebar />
      <main className="md:ml-sidebar-width flex-1 flex flex-col">
        {/* Top bar */}
        <header className="bg-surface border-b border-slate/10 h-16 px-gutter flex justify-between items-center sticky top-0 z-40">
          <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Today&apos;s Overview</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined text-on-surface-variant hover:text-ink cursor-pointer transition-colors">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-blocked rounded-full" />
            </div>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-ink cursor-pointer">help</span>
          </div>
        </header>

        <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
          {/* Overdue banner */}
          <div className="bg-panel p-4 rounded border-l-4 border-l-blocked shadow-sm mb-stack-lg flex items-center justify-between kpi-card">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blocked">warning</span>
              <div>
                <h3 className="font-headline-md text-headline-md text-blocked">3 assets overdue for return</h3>
                <p className="font-body-sm text-on-surface-variant mt-1">Flagged for immediate follow-up and reallocation block.</p>
              </div>
            </div>
            <button className="bg-panel border border-slate/20 text-ink px-4 py-2 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
              View Details
            </button>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-md mb-stack-lg">
            {kpis.map((k) => (
              <div key={k.label} className={`bg-panel p-6 rounded kpi-card flex flex-col justify-between h-full ${k.accent}`}>
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider mb-2">{k.label}</span>
                <div className="flex items-end justify-between">
                  <span className={`font-display-kpi text-display-kpi ${k.color}`}>{k.value}</span>
                  <span className={`material-symbols-outlined text-[32px] ${k.color} opacity-50`}>{k.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-panel p-6 rounded kpi-card">
                <h3 className="font-headline-md text-headline-md text-ink mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/assets" className="w-full bg-ink text-on-primary py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-primary transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">add_circle</span> Register Asset
                  </Link>
                  <Link href="/booking" className="w-full bg-panel border border-slate/20 text-ink py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
                    <span className="material-symbols-outlined text-[18px]">calendar_add_on</span> Book Resource
                  </Link>
                  <Link href="/maintenance" className="w-full bg-panel border border-slate/20 text-ink py-3 px-4 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-surface transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
                    <span className="material-symbols-outlined text-[18px]">support_agent</span> Raise Request
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-panel p-6 rounded kpi-card h-full">
                <h3 className="font-headline-md text-headline-md text-ink mb-6 flex items-center justify-between">
                  Recent Activity
                  <Link href="/activity" className="text-sm font-label-caps text-label-caps uppercase text-slate hover:text-ink transition-colors">View All</Link>
                </h3>
                <div className="space-y-6">
                  {activities.map((a, i) => (
                    <div key={i} className="flex gap-4 items-start relative group">
                      <div className="w-px h-full bg-slate/10 absolute left-4 top-8 -bottom-6 group-last:hidden" />
                      <div className={`w-8 h-8 rounded-full ${a.iconBg} flex items-center justify-center shrink-0 z-10 border`}>
                        <span className={`material-symbols-outlined ${a.iconColor} text-[16px]`}>{a.icon}</span>
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-body-sm text-on-surface-variant">{a.text}</p>
                          <span className="font-label-caps text-label-caps text-slate">{a.time}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {a.tag && (
                            <div className="inline-flex items-center bg-fog px-2 py-1 asset-tag-notch group/tag cursor-pointer relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-2 h-2 bg-tag-line z-10" />
                              <span className="font-label-mono text-label-mono text-ink pl-3 relative z-20">{a.tag}</span>
                              <div className={`absolute bottom-0 left-0 h-[2px] w-0 ${a.tagColor} transition-all duration-300 group-hover/tag:w-full z-20`} />
                            </div>
                          )}
                          <span className="text-xs text-slate font-body-sm">{a.sub}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
