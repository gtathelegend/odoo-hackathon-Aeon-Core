"use client";
import { useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/auth.service";
import { useAuthStore } from "../../store/auth.store";
import { ApiError } from "../../lib/api-client";

function ProfileForm() {
  const { user, logout } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await authService.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
      setUser(res.user);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="md:ml-sidebar-width flex-1 p-margin-main max-w-4xl mx-auto w-full">
      <header className="mb-stack-lg">
        <h1 className="text-headline-lg font-headline-lg text-ink font-bold">Profile</h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Manage your personal information and account.</p>
      </header>

      <section className="bg-panel border border-slate/10 rounded p-6 mb-stack-lg">
        <h2 className="text-headline-md font-headline-md text-ink mb-4">Account</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <dt className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Email</dt>
            <dd className="font-body-lg text-body-lg text-ink mt-1">{user?.email}</dd>
          </div>
          <div>
            <dt className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Role</dt>
            <dd className="font-body-lg text-body-lg text-ink mt-1">{user?.role}</dd>
          </div>
        </dl>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface"
            />
          </div>
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-2">
            <div className="min-h-[24px] text-body-sm font-body-sm">
              {error && <span className="text-blocked">{error}</span>}
              {message && <span className="text-available">{message}</span>}
            </div>
            <div className="flex gap-3">
              <Link href="/change-password" className="bg-panel border border-slate/20 text-ink px-4 py-2 rounded font-label-caps text-label-caps uppercase text-xs hover:bg-fog transition-colors">
                Change password
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="bg-ink hover:bg-ink/90 text-on-primary px-5 py-2 rounded font-label-caps text-label-caps uppercase text-xs disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="bg-panel border border-slate/10 rounded p-6">
        <h2 className="text-headline-md font-headline-md text-ink mb-2">Session</h2>
        <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
          Signing out revokes all refresh tokens across every device.
        </p>
        <button
          onClick={logout}
          className="bg-blocked hover:bg-blocked/90 text-on-primary px-5 py-2 rounded font-label-caps text-label-caps uppercase text-xs"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <ProfileForm />
      </div>
    </AuthGuard>
  );
}
