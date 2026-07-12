"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "../../../services/auth.service";
import { ApiError } from "../../../lib/api-client";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    numOrSpecial: /[\d\W]/.test(password),
  };
  const passwordOk = checks.len && checks.upper && checks.lower && checks.numOrSpecial;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordOk) {
      setError("Password does not meet all requirements.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword({ token: params.token, password });
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-fog min-h-screen flex items-center justify-center p-gutter">
      <div className="w-full max-w-[380px] bg-panel border border-slate/10 asset-tag-notch relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-available" />
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-ink asset-tag-notch flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-3xl">password</span>
            </div>
          </div>
          <h2 className="text-headline-md font-headline-md text-ink font-semibold text-center mb-6">Choose a new password</h2>

          <form onSubmit={handleSubmit} className="space-y-stack-md">
            <div>
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">New password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface"
              />
            </div>

            {error && (
              <div className="bg-blocked/10 border-l-4 border-blocked p-3">
                <p className="font-body-sm text-body-sm text-blocked">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-ink text-on-primary font-label-caps text-label-caps uppercase py-3 px-4 rounded hover:bg-ink/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting ? "Resetting…" : "Reset Password"}
            </button>

            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
              <Link href="/login" className="text-ink font-semibold hover:underline">Back to sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
