"use client";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { useAuth } from "../../hooks/useAuth";
import {
  departmentsService,
  type Department,
  type CreateDepartmentPayload,
} from "../../services/departments.service";
import { ApiError } from "../../lib/api-client";

interface Row {
  dept: Department;
  depth: number;
}

/**
 * Build a display-friendly indented list from the department tree. Children
 * are grouped under their parents so the table renders as an org chart.
 */
function buildRows(depts: Department[]): Row[] {
  const byParent = new Map<string | null, Department[]>();
  for (const d of depts) {
    const key = d.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(d);
  }
  const rows: Row[] = [];
  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      rows.push({ dept: child, depth });
      walk(child.id, depth + 1);
    }
  }
  walk(null, 0);
  return rows;
}

function OrganizationView() {
  const { hasMinRole } = useAuth();
  const canManage = hasMinRole("ASSET_MANAGER");
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const tree = await departmentsService.tree();
      setItems(tree);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const rows = useMemo(() => buildRows(items), [items]);

  async function handleDelete(dept: Department) {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await departmentsService.remove(dept.id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <main className="md:ml-sidebar-width flex-1 p-margin-main max-w-7xl mx-auto w-full">
      <div className="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-ink font-bold">Organization Setup</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Configure departments, asset categories, and employees.</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="bg-ink hover:bg-ink/90 text-on-primary px-4 py-2 rounded font-label-caps text-label-caps tracking-wider transition-colors flex items-center gap-2 w-fit focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>ADD DEPARTMENT</span>
          </button>
        )}
      </div>

      <div className="border-b border-slate/10 mb-stack-lg flex gap-8">
        <button className="pb-2 border-b-2 border-ink text-ink font-label-caps text-label-caps tracking-wider">DEPARTMENTS</button>
        <button className="pb-2 border-b-2 border-transparent text-on-surface-variant hover:text-ink transition-colors font-label-caps text-label-caps tracking-wider">CATEGORIES</button>
        <button className="pb-2 border-b-2 border-transparent text-on-surface-variant hover:text-ink transition-colors font-label-caps text-label-caps tracking-wider">EMPLOYEES</button>
      </div>

      <div className="bg-panel border border-slate/10 rounded shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-slate/5" />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate/10 bg-surface-container-low/50">
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Department</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Code</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Parent</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Employees</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Status</th>
                {canManage && <th className="py-3 px-4 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/10">
              {loading && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="py-6 px-4 text-body-sm text-on-surface-variant text-center">Loading…</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="py-6 px-4 text-body-sm text-on-surface-variant text-center">
                    No departments yet.
                  </td>
                </tr>
              )}
              {rows.map(({ dept, depth }) => (
                <tr key={dept.id} className="hover:bg-fog/50 transition-colors group">
                  <td className="py-3 px-4" style={{ paddingLeft: `${16 + depth * 24}px` }}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate text-[18px]">{depth === 0 ? "folder" : "subdirectory_arrow_right"}</span>
                      <span className="font-body-sm font-medium text-ink">{dept.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-label-mono text-label-mono text-slate text-xs">{dept.code}</td>
                  <td className="py-3 px-4 font-body-sm text-on-surface-variant">{dept.parent?.name ?? "—"}</td>
                  <td className="py-3 px-4 font-body-sm text-on-surface-variant">{dept._count?.employees ?? 0}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${dept.status === "ACTIVE" ? "bg-available" : dept.status === "ARCHIVED" ? "bg-blocked" : "bg-slate"}`} />
                      <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">{dept.status}</span>
                    </div>
                  </td>
                  {canManage && (
                    <td className="py-3 px-4 text-right">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditing(dept);
                            setModalOpen(true);
                          }}
                          className="text-slate hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink rounded"
                          aria-label="Edit"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
                          className="text-slate hover:text-blocked focus:outline-none focus:ring-2 focus:ring-blocked rounded"
                          aria-label="Delete"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && (
          <div className="p-4 border-t border-blocked/20 bg-blocked/5">
            <p className="text-body-sm text-blocked flex items-center gap-2 text-xs">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {error}
            </p>
          </div>
        )}
        <div className="p-4 border-t border-slate/10 bg-surface-container-low/20">
          <p className="text-body-sm text-slate italic flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Editing a department here also drives the picklist in Resource Booking and Assets.
          </p>
        </div>
      </div>

      {modalOpen && (
        <DepartmentModal
          departments={items}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await reload();
          }}
        />
      )}
    </main>
  );
}

function DepartmentModal({
  departments,
  initial,
  onClose,
  onSaved,
}: {
  departments: Department[];
  initial: Department | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [parentId, setParentId] = useState<string>(initial?.parentId ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "ARCHIVED">(initial?.status ?? "ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = departments.filter((d) => d.id !== initial?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload: CreateDepartmentPayload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      parentId: parentId || null,
      status: status === "ARCHIVED" ? "INACTIVE" : status,
    };
    try {
      if (initial) {
        await departmentsService.update(initial.id, { ...payload, status });
      } else {
        await departmentsService.create(payload);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50">
      <div className="bg-panel w-full max-w-lg rounded shadow-lg">
        <div className="p-5 border-b border-slate/10">
          <h3 className="text-headline-md font-headline-md text-ink">{initial ? "Edit department" : "New department"}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg" />
          </div>
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Code</label>
            <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-label-mono text-label-mono" />
          </div>
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Parent</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg">
              <option value="">— None (root) —</option>
              {parentOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "ARCHIVED")} className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              {initial && <option value="ARCHIVED">Archived</option>}
            </select>
          </div>
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-sm text-body-sm" />
          </div>

          {error && (
            <div className="bg-blocked/10 border-l-4 border-blocked p-3">
              <p className="font-body-sm text-body-sm text-blocked">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="bg-panel border border-slate/20 text-ink px-4 py-2 rounded font-label-caps text-label-caps uppercase text-xs hover:bg-fog transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="bg-ink hover:bg-ink/90 text-on-primary px-5 py-2 rounded font-label-caps text-label-caps uppercase text-xs disabled:opacity-60">
              {submitting ? "Saving…" : initial ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrganizationPage() {
  return (
    <AuthGuard>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <OrganizationView />
      </div>
    </AuthGuard>
  );
}
