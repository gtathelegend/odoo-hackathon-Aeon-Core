"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { AuthGuard } from "../../components/auth-guard";
import { apiClient } from "../../lib/api-client";

interface Booking {
  id: string;
  status: string;
  purpose: string | null;
  startTime: string;
  endTime: string;
  notes: string | null;
  asset?: { assetTag: string; name: string } | null;
  sharedResource?: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-pending/10 text-pending",
  CONFIRMED: "bg-allocated/10 text-allocated",
  ACTIVE: "bg-available/10 text-available",
  COMPLETED: "bg-slate/10 text-slate",
  CANCELLED: "bg-blocked/10 text-blocked",
  NO_SHOW: "bg-blocked/10 text-blocked",
};

export default function BookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const data = await apiClient.get<{ items: Booking[]; total: number }>("/booking", {
        query: { page: 1, limit: 25 },
      });
      setBookings(data.items ?? []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="bg-fog min-h-screen flex">
        <Sidebar />
        <main className="md:ml-sidebar-width flex-1 flex flex-col">
          <header className="bg-surface border-b border-slate/10 h-16 px-gutter flex justify-between items-center sticky top-0 z-40">
            <h2 className="font-headline-lg text-headline-lg font-bold text-ink tracking-tight">Resource Booking</h2>
          </header>

          <div className="p-gutter lg:p-margin-main flex-1 max-w-[1400px] mx-auto w-full">
            <div className="flex justify-end mb-stack-lg">
              <button className="bg-ink text-on-primary px-6 py-2.5 rounded-lg font-label-caps text-label-caps uppercase font-bold hover:bg-primary transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                New Booking
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">event_available</span>
                <p className="text-body-sm">No bookings found</p>
              </div>
            ) : (
              <div className="bg-panel rounded-lg border border-slate/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-slate/10 bg-fog/50">
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Resource</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Purpose</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Status</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">Start</th>
                        <th className="text-left px-4 py-3 font-label-caps text-label-caps uppercase text-on-surface-variant">End</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate/5">
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-fog/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink">{booking.asset?.name ?? booking.sharedResource?.name ?? "—"}</div>
                            {booking.asset?.assetTag && <div className="text-xs text-on-surface-variant">{booking.asset.assetTag}</div>}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{booking.purpose ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[booking.status] ?? "bg-slate/10 text-slate"}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{new Date(booking.startTime).toLocaleString()}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{new Date(booking.endTime).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
