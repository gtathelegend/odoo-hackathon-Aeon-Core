"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { useAuthStore } from "../../store/auth.store";
import { authService } from "../../services/auth.service";
import { ApiError } from "../../lib/api-client";

function ChangePasswordForm() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = {
    len: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    numOrSpecial: /[\d\W]/.test(newPassword),
  };
  const passwordOk = checks.len && checks.upper && checks.lower && checks.numOrSpecial;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordOk) return setError("New password does not meet all requirements.");
    if (newPassword !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      // Backend revokes all refresh tokens — force fresh sign-in.
      clear();
      router.push("/login?passwordChanged=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to change password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="md:ml-sidebar-width flex-1 p-margin-main max-w-2xl mx-auto w-full">
      <header className="mb-stack-lg">
        <h1 className="text-headline-lg font-headline-lg text-ink font-bold">Change Password</h1>
        <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
          You&apos;ll be signed out of all other sessions after saving.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="bg-panel border border-slate/10 rounded p-6 space-y-4">
        <div>
          <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Current password</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface"
          />
        </div>
        <div>
          <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">New password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface"
          />
          <div className="mt-stack-sm flex space-x-1">
            {[checks.len, checks.upper, checks.lower, checks.numOrSpecial].map((ok, i) => (
              <div key={i} className="w-8 h-1 bg-surface-variant rounded-full overflow-hidden">
                <div className={`h-full bg-available transition-all duration-300 ${ok ? "w-full" : "w-0"}`} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Confirm new password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface"
          />
        </div>

        {error && (
          <div className="bg-blocked/10 border-l-4 border-blocked p-3">
            <p className="font-body-sm text-body-sm text-blocked">{error}</p>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-ink hover:bg-ink/90 text-on-primary px-5 py-2 rounded font-label-caps text-label-caps uppercase text-xs disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function ChangePasswordPage() {
  return (
    <AuthGuard>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <ChangePasswordForm />
      </div>
    </AuthGuard>
  );
}
