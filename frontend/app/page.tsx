import { ScreenCard } from "../components/screen-card";
import { fetchBackendHealth } from "../lib/api";

const screens = [
  {
    title: "Authentication",
    description: "Login and self-signup connect to the AssetFlow API through the auth routes.",
    bullets: ["Employee-only signup", "Password policy", "Lockout and idle timeout"],
  },
  {
    title: "Dashboard",
    description: "KPI cards, recent activity, and quick actions are powered by backend-scoped queries.",
    bullets: ["Role-aware KPIs", "Overdue return flags", "Recent event feed"],
  },
  {
    title: "Assets and Workflows",
    description: "Assets, allocations, bookings, maintenance, audits, and reports are driven by the backend module.",
    bullets: ["Lifecycle state machine", "Conflict resolution", "Notifications and audit log"],
  },
];

export default async function HomePage() {
  const health = await fetchBackendHealth();

  return (
    <main className="page">
      <div className="shell">
        <section className="hero">
          <div>
            <span className="badge">Next.js frontend + Express API</span>
            <h1>AssetFlow</h1>
            <p>
              This frontend points at the AssetFlow Express API through{" "}
              <code>NEXT_PUBLIC_API_URL</code>.
            </p>
          </div>
          <aside className="panel">
            <h2>Backend Status</h2>
            <div className={`status ${health.ok ? "ok" : "fail"}`}>
              <span>{health.ok ? "Connected" : "Unavailable"}</span>
              <span>{health.message}</span>
            </div>
            <p>
              Set <code>NEXT_PUBLIC_API_URL</code> to your backend URL, for
              example <code>https://assetflow-api.example.com/api/v1</code>.
            </p>
          </aside>
        </section>

        <section className="grid">
          {screens.map((screen) => (
            <ScreenCard key={screen.title} {...screen} />
          ))}
        </section>

        <section className="footer">
          The backend is a modular Express + TypeScript API under{" "}
          <code>backend/</code>. This <code>frontend/</code> Next.js app
          composes the user-facing experience.
        </section>
      </div>
    </main>
  );
}
