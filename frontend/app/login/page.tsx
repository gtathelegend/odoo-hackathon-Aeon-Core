"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    // Email format validation (Requirement 1.9)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address (e.g. name@domain.com)");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.ok && result.data) {
        // Store user info in localStorage
        localStorage.setItem("assetflow_user", JSON.stringify(result.data));
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setError(result.error || "Login failed. Please check your credentials.");
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
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-ink asset-tag-notch flex items-center justify-center relative">
              <span className="material-symbols-outlined text-on-primary text-3xl">precision_manufacturing</span>
            </div>
          </div>

          <form className="space-y-stack-md" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="bg-error-container border-l-4 border-error text-on-error-container px-4 py-3 rounded text-body-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-panel font-body-lg text-body-lg text-on-surface px-3 py-2 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block font-body-sm text-body-sm text-on-surface-variant mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-panel border border-slate/20 rounded focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-panel font-body-lg text-body-lg text-on-surface px-3 py-2 disabled:opacity-50"
              />
              {/* Password strength ticks */}
              <div className="mt-stack-sm flex items-center justify-between">
                <div className="flex space-x-1">
                  {[checks.len, checks.upper, checks.lower, checks.numOrSpecial].map((ok, i) => (
                    <div key={i} className="w-8 h-1 bg-surface-variant rounded-full overflow-hidden">
                      <div className={`h-full bg-available transition-all duration-300 ${ok ? "w-full" : "w-0"}`} />
                    </div>
                  ))}
                </div>
                <a href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-ink transition-colors">
                  Forgot password
                </a>
              </div>
            </div>

            {/* Sign in button */}
            <div className="pt-stack-sm">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-on-primary font-label-caps text-label-caps uppercase py-3 px-4 rounded hover:bg-ink/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </div>

            {/* Signup note */}
            <div className="pt-stack-sm">
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">New here?</p>
              <div className="bg-surface p-3 border-l-4 border-slate/20 mb-stack-md">
                <p className="font-body-sm text-body-sm text-on-surface">
                  Sign up creates an employee account. Admin roles assigned later.
                </p>
              </div>
              <Link
                href="/signup"
                className="block w-full text-center bg-surface border border-slate/20 text-ink font-label-caps text-label-caps uppercase py-3 px-4 rounded hover:bg-fog transition-colors focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
              >
                Create Account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
