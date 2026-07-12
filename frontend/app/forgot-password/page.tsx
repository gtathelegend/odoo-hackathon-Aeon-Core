"use client";
import { useState } from "react";
import Link from "next/link";
import { authService } from "../../services/auth.service";
import { ApiError } from "../../lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setDevToken(null);
    try {
      const res = await authService.forgotPassword({ email: email.trim() });
      setMessage("If an account matches that email, a reset link has been sent.");
      if (res && "resetToken" in res && res.resetToken) {
        setDevToken(res.resetToken);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
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
              <span className="material-symbols-outlined text-on-primary text-3xl">lock_reset</span>
            </div>
          </div>
          <h2 className="text-headline-md font-headline-md text-ink font-semibold text-center mb-2">Reset your password</h2>
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant mb-6">
            Enter the email associated with your account and we&apos;ll send a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-stack-md">
            <div>
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface"
              />
            </div>

            {error && (
              <div className="bg-blocked/10 border-l-4 border-blocked p-3">
                <p className="font-body-sm text-body-sm text-blocked">{error}</p>
              </div>
            )}
            {message && (
              <div className="bg-available/10 border-l-4 border-available p-3">
                <p className="font-body-sm text-body-sm text-ink">{message}</p>
                {devToken && (
                  <p className="mt-2 font-label-mono text-label-mono text-slate break-all">
                    Dev token: <Link href={`/reset-password/${devToken}`} className="underline">use it here</Link>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-ink text-on-primary font-label-caps text-label-caps uppercase py-3 px-4 rounded hover:bg-ink/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send Reset Link"}
            </button>

            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
              Remembered it?{" "}
              <Link href="/login" className="text-ink font-semibold hover:underline">Back to sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
