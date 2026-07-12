"use client";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../../components/sidebar";
import { AuthGuard } from "../../../components/auth-guard";
import { useAuth } from "../../../hooks/useAuth";
import {
  usersService,
  type UserSummary,
} from "../../../services/users.service";
import {
  departmentsService,
  type Department,
} from "../../../services/departments.service";
import type { AuthRole } from "../../../store/auth.store";
import { ApiError } from "../../../lib/api-client";

const ROLE_OPTIONS: AuthRole[] = ["EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"];

function UsersView() {
  const { user: current, hasMinRole } = useAuth();
  const canDelete = hasMinRole("ADMIN");
  const [items, setItems] = useState<UserSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const [users, tree] = await Promise.all([
        usersService.list({ search: q, limit: 50 }),
        departmentsService.tree(),
      ]);
      setItems(users.data);
      setDepartments(tree);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const deptById = useMemo(() => {
    const map = new Map<string, Department>();
    for (const d of departments) map.set(d.id, d);
    return map;
  }, [departments]);

  async function handleRoleChange(u: UserSummary, role: AuthRole) {
    try {
      const updated = await usersService.assignRole(u.id, role);
      setItems((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Role update failed");
    }
  }

  async function handleDelete(u: UserSummary) {
    if (!confirm(`Deactivate ${u.email}?`)) return;
    try {
      await usersService.remove(u.id);
      setItems((prev) => prev.filter((row) => row.id !== u.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <main className="md:ml-sidebar-width flex-1 p-margin-main max-w-7xl mx-auto w-full">
      <header className="mb-stack-lg flex items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-ink font-bold">User Management</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Manage roles, departments and account status.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reload(search.trim() || undefined);
          }}
          className="flex gap-2"
        >
          <input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-sm text-body-sm text-on-surface min-w-[240px]"
          />
          <button
            type="submit"
            className="bg-panel border border-slate/20 text-ink px-4 py-2 rounded font-label-caps text-label-caps uppercase text-xs hover:bg-fog transition-colors"
          >
            Search
          </button>
        </form>
      </header>

      {error && (
        <div className="mb-4 bg-blocked/10 border-l-4 border-blocked p-3">
          <p className="font-body-sm text-body-sm text-blocked">{error}</p>
        </div>
      )}

      <div className="bg-panel border border-slate/10 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate/10 bg-surface-container-low/50">
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Role</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Department</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Status</th>
                {canDelete && <th className="py-3 px-4 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/10">
              {loading && (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="py-6 px-4 text-body-sm text-on-surface-variant text-center">Loading…</td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="py-6 px-4 text-body-sm text-on-surface-variant text-center">No users match.</td>
                </tr>
              )}
              {items.map((u) => {
                const deptId = u.employee?.departmentId ?? null;
                const dept = deptId ? deptById.get(deptId) : null;
                const isSelf = u.id === current?.id;
                return (
                  <tr key={u.id} className="hover:bg-fog/50 transition-colors">
                    <td className="py-3 px-4 font-body-sm font-medium text-ink">{u.firstName} {u.lastName}</td>
                    <td className="py-3 px-4 font-body-sm text-on-surface-variant">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value as AuthRole)}
                        disabled={isSelf}
                        className="bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-2 py-1 text-body-sm text-ink font-body-sm disabled:opacity-60"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 font-body-sm text-on-surface-variant">{dept ? dept.name : "—"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${u.isActive ? "bg-available" : "bg-blocked"}`} />
                        <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    {canDelete && (
                      <td className="py-3 px-4 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-slate hover:text-blocked focus:outline-none focus:ring-2 focus:ring-blocked rounded"
                            aria-label="Deactivate user"
                          >
                            <span className="material-symbols-outlined text-[18px]">person_off</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthGuard roles={["ADMIN", "ASSET_MANAGER"]}>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <UsersView />
      </div>
    </AuthGuard>
  );
}
