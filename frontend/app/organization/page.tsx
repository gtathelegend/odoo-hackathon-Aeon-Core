"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { fetchDepartments, fetchCategories, fetchEmployees } from "../../lib/api";

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState("departments");
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "departments") {
        const res = await fetchDepartments();
        if (res.ok && res.data) setDepartments(res.data);
      } else if (activeTab === "categories") {
        const res = await fetchCategories();
        if (res.ok && res.data) setCategories(res.data);
      } else if (activeTab === "employees") {
        const res = await fetchEmployees();
        if (res.ok && res.data) setEmployees(res.data);
      }
    } catch (err) {
      console.error("Error loading organization data:", err);
    }
    setLoading(false);
  };

  return (
    <div className="bg-fog min-h-screen flex">
      <Sidebar />
      <main className="md:ml-sidebar-width flex-1 p-margin-main max-w-7xl mx-auto w-full flex flex-col gap-stack-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-ink font-bold">Organization Setup</h1>
            <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Configure departments, asset categories, and employees.</p>
          </div>
          {activeTab === "departments" && (
            <button className="bg-ink hover:bg-ink/90 text-on-primary px-4 py-2 rounded font-label-caps text-label-caps tracking-wider transition-colors flex items-center gap-2 w-fit focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>ADD DEPARTMENT</span>
            </button>
          )}
        </div>

        {/* Tab Strip */}
        <div className="border-b border-slate/10 flex gap-8">
          <button
            onClick={() => setActiveTab("departments")}
            className={`pb-2 border-b-2 font-label-caps text-label-caps tracking-wider transition-all ${
              activeTab === "departments" ? "border-ink text-ink font-semibold" : "border-transparent text-on-surface-variant hover:text-ink"
            }`}
          >
            DEPARTMENTS
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`pb-2 border-b-2 font-label-caps text-label-caps tracking-wider transition-all ${
              activeTab === "categories" ? "border-ink text-ink font-semibold" : "border-transparent text-on-surface-variant hover:text-ink"
            }`}
          >
            CATEGORIES
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`pb-2 border-b-2 font-label-caps text-label-caps tracking-wider transition-all ${
              activeTab === "employees" ? "border-ink text-ink font-semibold" : "border-transparent text-on-surface-variant hover:text-ink"
            }`}
          >
            EMPLOYEES
          </button>
        </div>

        {/* Data Display */}
        <div className="bg-panel border border-slate/10 rounded shadow-sm overflow-hidden relative min-h-[300px] flex flex-col">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate/5" />
          
          {loading ? (
            <div className="flex-1 flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              {activeTab === "departments" && (
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
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate">No departments configured</td>
                      </tr>
                    ) : (
                      departments.map((d) => (
                        <tr key={d.id} className="hover:bg-fog/50 transition-colors group cursor-pointer">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate text-[18px]">folder</span>
                              <span className="font-body-sm font-medium text-ink">{d.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-body-sm text-on-surface-variant">{d.manager_id ? d.manager_id[1] : "--"}</td>
                          <td className="py-3 px-4 font-label-mono text-label-mono text-slate text-xs">{d.parent_id ? d.parent_id[1] : "--"}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-available" />
                              <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Active</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="text-slate hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ink rounded">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === "categories" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate/10 bg-surface-container-low/50">
                      <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Category Name</th>
                      <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Maintenance Interval</th>
                      <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Useful Life</th>
                      <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="py-3 px-4 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate/10">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate">No categories configured</td>
                      </tr>
                    ) : (
                      categories.map((c) => (
                        <tr key={c.id} className="hover:bg-fog/50 transition-colors group cursor-pointer">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate text-[18px]">category</span>
                              <span className="font-body-sm font-medium text-ink">{c.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-body-sm text-on-surface-variant">{c.maintenance_interval_days} Days</td>
                          <td className="py-3 px-4 font-body-sm text-on-surface-variant">{c.useful_life_years} Years</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${c.active ? "bg-available" : "bg-slate"}`} />
                              <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                                {c.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="text-slate hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ink rounded">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === "employees" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate/10 bg-surface-container-low/50">
                      <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Employee Name</th>
                      <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Department</th>
                      <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Role</th>
                      <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="py-3 px-4 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate/10">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate">No employees configured</td>
                      </tr>
                    ) : (
                      employees.map((e) => (
                        <tr key={e.id} className="hover:bg-fog/50 transition-colors group cursor-pointer">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate text-[18px]">person</span>
                              <span className="font-body-sm font-medium text-ink">{e.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-body-sm text-on-surface-variant">{e.department_id ? e.department_id[1] : "--"}</td>
                          <td className="py-3 px-4 font-label-caps text-label-caps text-slate text-xs uppercase">{e.assetflow_role || "employee"}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${e.active ? "bg-available" : "bg-slate"}`} />
                              <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                                {e.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="text-slate hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ink rounded">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="p-4 border-t border-slate/10 bg-surface-container-low/20 mt-auto">
            <p className="text-body-sm text-slate italic flex items-center gap-2 text-xs">
              <span className="material-symbols-outlined text-[14px]">info</span>
              Organization records directly drive dropdown and allocation listings throughout AssetFlow.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
