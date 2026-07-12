import { ScreenCard } from "../components/screen-card";
import { fetchBackendHealth } from "../lib/api";

const screens = [
  {
    title: "Authentication",
    description: "Login and self-signup connect to the Odoo backend through AssetFlow auth routes.",
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
            <span className="badge">Vercel frontend + Render backend</span>
            <h1>AssetFlow</h1>
            <p>
              This frontend is prepared for Vercel deployment and points at the
              Render-hosted Odoo backend through <code>NEXT_PUBLIC_API_BASE_URL</code>.
            </p>
          </div>
          <aside className="panel">
            <h2>Backend Status</h2>
            <div className={`status ${health.ok ? "ok" : "fail"}`}>
              <span>{health.ok ? "Connected" : "Unavailable"}</span>
              <span>{health.message}</span>
            </div>
            <p>
              Set <code>NEXT_PUBLIC_API_BASE_URL</code> in Vercel to your Render
              backend URL, for example <code>https://assetflow-backend.onrender.com</code>.
            </p>
          </aside>
        </section>

        <section className="grid">
          {screens.map((screen) => (
            <ScreenCard key={screen.title} {...screen} />
          ))}
        </section>

        <section className="footer">
          Backend deployment is defined in <code>render.yaml</code>. Frontend
          deployment uses this <code>frontend</code> app as the Vercel project
          root.
        </section>
      </div>
    </main>
  );
}
