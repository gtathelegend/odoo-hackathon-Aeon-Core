"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>({
    name: "John Doe",
    email: "john.doe@company.com",
    role: "employee",
  });

  // Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [overdueReminders, setOverdueReminders] = useState(true);
  const [bookingNotifications, setBookingNotifications] = useState(true);

  // General States
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Load profile from localStorage
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("assetflow_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setProfile({
            name: parsed.name || "John Doe",
            email: parsed.email || "john.doe@company.com",
            role: parsed.role || "employee",
          });
        } catch (e) {
          console.error("Error parsing user profile from localStorage", e);
        }
      }

      // Load settings
      const storedSettings = localStorage.getItem("assetflow_settings");
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          setEmailAlerts(parsed.emailAlerts ?? true);
          setOverdueReminders(parsed.overdueReminders ?? true);
          setBookingNotifications(parsed.bookingNotifications ?? true);
        } catch (e) {
          console.error("Error parsing app settings from localStorage", e);
        }
      }
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    try {
      const settings = {
        emailAlerts,
        overdueReminders,
        bookingNotifications,
      };
      localStorage.setItem("assetflow_settings", JSON.stringify(settings));
      setSaveMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err) {
      setSaveMessage({ type: "error", text: "Failed to persist settings in local storage." });
    }
    setSaving(false);
  };

  return (
    <div className="bg-fog text-on-surface font-body-sm min-h-screen flex">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar-width p-margin-main flex flex-col h-screen overflow-hidden gap-stack-lg">
        {/* Header */}
        <header className="flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-headline-lg font-headline-lg text-ink font-semibold">System Settings</h2>
            <p className="text-on-surface-variant text-body-sm font-body-sm mt-1">Configure profile details and notifications</p>
          </div>
        </header>

        {/* Settings Canvas */}
        <div className="flex-1 overflow-y-auto pr-2 pb-12">
          <div className="max-w-3xl flex flex-col gap-6">
            {saveMessage && (
              <div
                className={`p-4 rounded border-l-4 font-body-sm text-body-sm ${
                  saveMessage.type === "success"
                    ? "bg-available/10 border-available text-available"
                    : "bg-error-container border-error text-on-error-container"
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            {/* Profile Info Section */}
            <section className="bg-panel border border-slate/10 p-6 rounded shadow-sm flex flex-col gap-4">
              <h3 className="font-label-caps text-label-caps text-ink font-bold uppercase tracking-wider">User Account Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-fog/30 p-4 rounded border border-slate/5">
                <div>
                  <span className="block font-label-caps text-[10px] text-slate mb-1">Display Name</span>
                  <span className="text-body-sm font-semibold text-ink">{profile.name}</span>
                </div>
                <div>
                  <span className="block font-label-caps text-[10px] text-slate mb-1">Email Address</span>
                  <span className="text-body-sm font-semibold text-ink">{profile.email}</span>
                </div>
                <div>
                  <span className="block font-label-caps text-[10px] text-slate mb-1">Security Role</span>
                  <span className="inline-flex items-center gap-1.5 font-label-caps text-[10px] bg-ink text-on-primary px-2 py-0.5 rounded font-bold uppercase mt-0.5">
                    {profile.role.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </section>

            {/* Preferences Form */}
            <form onSubmit={handleSaveSettings} className="bg-panel border border-slate/10 p-6 rounded shadow-sm flex flex-col gap-6">
              <h3 className="font-label-caps text-label-caps text-ink font-bold uppercase tracking-wider">Notification Preferences</h3>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-ink focus:ring-ink border-slate/30 mt-0.5"
                  />
                  <div>
                    <span className="text-body-sm font-medium text-ink group-hover:text-primary transition-colors">Receive System Email Alerts</span>
                    <p className="text-xs text-on-surface-variant">Sends login notifications, security lockouts, and system audit updates.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={overdueReminders}
                    onChange={(e) => setOverdueReminders(e.target.checked)}
                    className="w-4 h-4 rounded text-ink focus:ring-ink border-slate/30 mt-0.5"
                  />
                  <div>
                    <span className="text-body-sm font-medium text-ink group-hover:text-primary transition-colors">Overdue Allocation Warnings</span>
                    <p className="text-xs text-on-surface-variant">Warns when an allocated asset is past its expected return date.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={bookingNotifications}
                    onChange={(e) => setBookingNotifications(e.target.checked)}
                    className="w-4 h-4 rounded text-ink focus:ring-ink border-slate/30 mt-0.5"
                  />
                  <div>
                    <span className="text-body-sm font-medium text-ink group-hover:text-primary transition-colors">Resource Booking Reminders</span>
                    <p className="text-xs text-on-surface-variant">Sends an in-app reminder 30 minutes before a scheduled room or equipment slot starts.</p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate/10 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-ink text-on-primary px-6 py-2.5 rounded font-label-caps text-label-caps font-bold hover:bg-ink/90 transition-colors focus:ring-2 focus:ring-ink"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
