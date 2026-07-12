"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "../../lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checks = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    numOrSpecial: /[\d\W]/.test(password),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!checks.len || !checks.upper || !checks.lower || !checks.numOrSpecial) {
      setError("Password must meet all security requirements");
      return;
    }

    setLoading(true);

    try {
      const result = await signup(email, password, name);

      if (result.ok && result.data) {
        // Auto-login after signup
        router.push("/login?registered=true");
      } else {
        setError(result.error || "Signup failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-fog min-h-screen flex items-center justify-center p-gutter">
      <div className="w-full max-w-[360px] bg-panel border border-slate/10 asset-tag-notch relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-available" />
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-ink asset-tag-notch flex items-center justify-center relative">
              <span className="material-symbols-outlined text-on-primary text-3xl">precision_manufacturing</span>
            </div>
          </div>
          <h2 className="text-headline-md font-headline-md text-ink font-semibold text-center mb-6">Create Account</h2>

          <form className="space-y-stack-md" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="bg-error-container border-l-4 border-error text-on-error-container px-4 py-3 rounded text-body-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Name (Optional)</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface disabled:opacity-50"
              />
              <div className="mt-stack-sm flex space-x-1">
                {[checks.len, checks.upper, checks.lower, checks.numOrSpecial].map((ok, i) => (
                  <div key={i} className="w-8 h-1 bg-surface-variant rounded-full overflow-hidden">
                    <div className={`h-full bg-available transition-all duration-300 ${ok ? "w-full" : "w-0"}`} />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1">8+ chars, uppercase, lowercase, digit or special</p>
            </div>
            <div>
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink px-3 py-2 font-body-lg text-body-lg text-on-surface disabled:opacity-50"
              />
            </div>
            <div className="bg-surface p-3 border-l-4 border-slate/20">
              <p className="font-body-sm text-body-sm text-on-surface">Account created as Employee. Admins promote roles later.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-on-primary font-label-caps text-label-caps uppercase py-3 px-4 rounded hover:bg-ink/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
            <p className="text-center text-body-sm text-on-surface-variant">
              Already have an account? <Link href="/login" className="text-ink font-semibold hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
