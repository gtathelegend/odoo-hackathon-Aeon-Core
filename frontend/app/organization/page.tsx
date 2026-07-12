import Sidebar from "../../components/sidebar";

const departments = [
  { name: "Engineering", head: "Aditi Rao", parent: "--", status: "Active", indent: false },
  { name: "Facilities", head: "Rohan Mehta", parent: "--", status: "Active", indent: false },
  { name: "Field Ops (East)", head: "Sana Iqbal", parent: "Facilities", status: "Inactive", indent: true },
];

export default function OrganizationPage() {
  return (
    <div className="bg-fog min-h-screen flex">
      <Sidebar />
      <main className="md:ml-sidebar-width flex-1 p-margin-main max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-ink font-bold">Organization Setup</h1>
            <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Configure departments, asset categories, and employees.</p>
          </div>
          <button className="bg-ink hover:bg-ink/90 text-on-primary px-4 py-2 rounded font-label-caps text-label-caps tracking-wider transition-colors flex items-center gap-2 w-fit focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>ADD DEPARTMENT</span>
          </button>
        </div>

        {/* Tab Strip */}
        <div className="border-b border-slate/10 mb-stack-lg flex gap-8">
          <button className="pb-2 border-b-2 border-ink text-ink font-label-caps text-label-caps tracking-wider">DEPARTMENTS</button>
          <button className="pb-2 border-b-2 border-transparent text-on-surface-variant hover:text-ink transition-colors font-label-caps text-label-caps tracking-wider">CATEGORIES</button>
          <button className="pb-2 border-b-2 border-transparent text-on-surface-variant hover:text-ink transition-colors font-label-caps text-label-caps tracking-wider">EMPLOYEES</button>
        </div>

        {/* Department Table */}
        <div className="bg-panel border border-slate/10 rounded shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate/5" />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate/10 bg-surface-container-low/50">
                  <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Department Name</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Head</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Parent Dept</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate/10">
                {departments.map((d) => (
                  <tr key={d.name} className={`hover:bg-fog/50 transition-colors group cursor-pointer ${d.indent ? "bg-surface-container-low/30" : ""}`}>
                    <td className={`py-3 px-4 ${d.indent ? "pl-10" : ""}`}>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate text-[18px]">{d.indent ? "folder_open" : "folder"}</span>
                        <span className="font-body-sm font-medium text-ink">{d.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-sm text-on-surface-variant">{d.head}</td>
                    <td className="py-3 px-4 font-label-mono text-label-mono text-slate text-xs">{d.parent}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${d.status === "Active" ? "bg-available" : "bg-slate"}`} />
                        <span className={`font-label-caps text-[10px] uppercase tracking-wider ${d.status === "Active" ? "text-on-surface-variant" : "text-slate"}`}>{d.status}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-slate hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ink rounded">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate/10 bg-surface-container-low/20">
            <p className="text-body-sm text-slate italic flex items-center gap-2 text-xs">
              <span className="material-symbols-outlined text-[14px]">info</span>
              Editing a department here also drives the picklist in Resource Booking and Assets.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
