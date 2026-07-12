"use client";
import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import { fetchAssets, fetchBookings, fetchEmployees, createBooking } from "../../lib/api";

export default function BookingPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  
  const [selectedAssetId, setSelectedAssetId] = useState<number | "">("");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Booking Form
  const [bookerEmployeeId, setBookerEmployeeId] = useState<number | "">("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedAssetId) {
      setSelectedAsset(assets.find((a) => a.id === selectedAssetId) || null);
    } else {
      setSelectedAsset(null);
    }
  }, [selectedAssetId, assets]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [assetsRes, empRes, bookingRes] = await Promise.all([
        fetchAssets(),
        fetchEmployees(),
        fetchBookings(),
      ]);

      if (assetsRes.ok && assetsRes.data) {
        // Filter bookable assets
        setAssets(assetsRes.data.filter((a: any) => a.is_bookable));
      }
      if (empRes.ok && empRes.data) {
        setEmployees(empRes.data.filter((e: any) => e.active));
      }
      if (bookingRes.ok && bookingRes.data) {
        setBookings(bookingRes.data);
      }
    } catch (err) {
      console.error("Error loading booking initial data:", err);
    }
    setLoading(false);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      setMessage({ type: "error", text: "Please select a resource to book." });
      return;
    }
    if (!bookerEmployeeId) {
      setMessage({ type: "error", text: "Please select the booking employee." });
      return;
    }

    setMessage(null);

    // Client-side validation mirroring backend rules (Requirement 12).
    const startDate = new Date(`${selectedDate}T${startTime}:00`);
    const endDate = new Date(`${selectedDate}T${endTime}:00`);
    if (endDate <= startDate) {
      setMessage({ type: "error", text: "End time must be later than the start time." });
      return;
    }
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
    if (durationMinutes < 15) {
      setMessage({ type: "error", text: "Minimum booking duration is 15 minutes." });
      return;
    }
    if (startDate < new Date()) {
      setMessage({ type: "error", text: "Bookings must start in the future." });
      return;
    }

    // Format times into Odoo Datetime format: "YYYY-MM-DD HH:MM:SS".
    const startStr = `${selectedDate} ${startTime}:00`;
    const endStr = `${selectedDate} ${endTime}:00`;

    const payload = {
      asset_id: selectedAssetId,
      booker_id: Number(bookerEmployeeId),
      start_time: startStr,
      end_time: endStr,
      purpose: purpose,
    };

    const res = await createBooking(payload);
    if (res.ok) {
      setMessage({ type: "success", text: "Booking created successfully!" });
      setPurpose("");
      // Reload bookings
      const bookingRes = await fetchBookings();
      if (bookingRes.ok && bookingRes.data) {
        setBookings(bookingRes.data);
      }
    } else {
      setMessage({ type: "error", text: res.error || "Failed to create booking." });
    }
  };

  // Timeline slots generation from 8 AM to 6 PM (10 hours)
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 to 18 (6 PM)

  // Find bookings for selected asset on selected date
  const filteredBookings = bookings.filter((b) => {
    if (!selectedAssetId) return false;
    if (!b.asset_id || b.asset_id[0] !== selectedAssetId) return false;
    if (b.status === "cancelled") return false;
    
    // Check if start_time date matches selectedDate
    // b.start_time format is "2024-07-07 09:00:00"
    const datePart = b.start_time.split(" ")[0];
    return datePart === selectedDate;
  });

  const getBookingForHour = (hour: number) => {
    return filteredBookings.find((b) => {
      const startHour = Number(b.start_time.split(" ")[1].split(":")[0]);
      return startHour === hour;
    });
  };

  return (
    <div className="bg-fog min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-sidebar-width h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-margin-main flex flex-col gap-stack-lg">
          {/* Header */}
          <div className="flex justify-between items-end shrink-0">
            <div>
              <h2 className="text-headline-lg font-headline-lg font-bold text-ink">Resource Booking</h2>
              <p className="text-on-surface-variant mt-1">Schedule and manage bookable assets.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter flex-1">
            {/* Left Panel: Selector, Details, Form */}
            <div className="lg:col-span-5 flex flex-col gap-stack-md overflow-y-auto pr-2 pb-6">
              {/* Asset Selector */}
              <div className="bg-panel border border-slate/10 rounded-lg p-stack-md shadow-sm">
                <label className="block text-label-caps font-label-caps text-on-surface-variant mb-stack-sm uppercase font-semibold">Select Resource</label>
                {loading ? (
                  <div className="animate-pulse h-10 bg-fog rounded" />
                ) : (
                  <div className="relative">
                    <select
                      value={selectedAssetId}
                      onChange={(e) => {
                        setSelectedAssetId(e.target.value ? Number(e.target.value) : "");
                        setMessage(null);
                      }}
                      className="w-full bg-surface border border-slate/30 rounded p-3 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none appearance-none"
                    >
                      <option value="">Choose a bookable resource...</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.asset_tag})
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3 text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                )}
              </div>

              {/* Selected Asset Card */}
              {selectedAsset && (
                <div className="bg-panel border border-slate/10 rounded-lg p-stack-md shadow-sm flex flex-col gap-stack-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-label-caps font-label-caps text-on-surface-variant uppercase text-xs">Resource Details</span>
                      <h3 className="text-headline-md font-headline-md text-ink font-semibold mt-1">{selectedAsset.name}</h3>
                    </div>
                    <div className="relative bg-surface px-3 py-1 asset-tag-notch flex flex-col group cursor-default border border-slate/10">
                      <div className="absolute top-0 left-0 w-2 h-2 bg-tag-line" />
                      <span className="font-label-mono text-label-mono text-ink">{selectedAsset.asset_tag}</span>
                      <div className="h-[2px] w-4 bg-available mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-stack-sm mt-2 text-body-sm">
                    <div>
                      <span className="text-on-surface-variant block text-xs font-semibold">Location</span>
                      <span className="text-ink">{selectedAsset.location || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-xs font-semibold">Category</span>
                      <span className="text-ink">{selectedAsset.category_id ? selectedAsset.category_id[1] : "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Form */}
              {selectedAsset && (
                <form onSubmit={handleCreateBooking} className="bg-panel border border-slate/10 rounded-lg p-stack-md shadow-sm flex flex-col gap-4">
                  <h3 className="font-label-caps text-label-caps text-ink font-semibold uppercase tracking-wider">Book This Resource</h3>
                  
                  {message && (
                    <div
                      className={`p-3 rounded border-l-4 font-body-sm text-[12px] ${
                        message.type === "success"
                          ? "bg-available/10 border-available text-available"
                          : "bg-error-container border-error text-on-error-container"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Booker (Employee)</label>
                    <div className="relative">
                      <select
                        value={bookerEmployeeId}
                        onChange={(e) => setBookerEmployeeId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full bg-surface border border-slate/30 rounded p-2 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none appearance-none"
                      >
                        <option value="">Select booker...</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-2 text-slate pointer-events-none text-[18px]">expand_more</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-surface border border-slate/30 rounded p-2 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate mb-1">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-surface border border-slate/30 rounded p-2 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate mb-1">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-surface border border-slate/30 rounded p-2 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate mb-1">Purpose</label>
                    <input
                      type="text"
                      placeholder="e.g. Weekly Standup Meeting"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full bg-surface border border-slate/30 rounded p-2 text-body-sm font-body-sm focus:ring-2 focus:ring-ink focus:outline-none"
                    />
                  </div>

                  <button
                    className="w-full bg-ink text-on-primary py-2.5 rounded font-label-caps text-label-caps uppercase font-bold hover:bg-ink/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ink"
                    type="submit"
                  >
                    Confirm Booking
                  </button>
                </form>
              )}
            </div>

            {/* Right Panel: Daily Timeline Calendar Grid */}
            <div className="lg:col-span-7 bg-panel border border-slate/10 rounded-lg p-stack-md shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-slate/10 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-body-lg font-body-lg font-bold text-ink">Schedule for {selectedDate}</h3>
                </div>
                <div className="text-label-caps font-label-caps text-on-surface-variant uppercase text-xs">UTC TIMEZONE</div>
              </div>

              {!selectedAssetId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate py-12">
                  <span className="material-symbols-outlined text-4xl mb-2">calendar_today</span>
                  <p className="text-body-sm">Select a resource to view its scheduling timeline</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="timeline-grid text-body-sm text-on-surface-variant">
                    {hours.map((hour) => {
                      const label = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? "12:00 PM" : `${hour}:00 AM`;
                      const activeBooking = getBookingForHour(hour);
                      return (
                        <div key={hour} className="contents border-b border-slate/10">
                          <div className="flex items-center justify-end pr-3 h-[60px] font-medium border-r border-slate/10">{label}</div>
                          <div className="relative h-[60px] bg-fog/20 border-b border-slate/10">
                            {activeBooking ? (
                              <div className="absolute inset-1 rounded p-2 bg-secondary-container border border-allocated/30 flex flex-col justify-center shadow-sm">
                                <span className="font-label-caps text-[9px] uppercase tracking-wider text-allocated font-bold">
                                  Booked by {activeBooking.booker_id ? activeBooking.booker_id[1] : "Staff"}
                                </span>
                                <span className="font-medium text-ink text-xs line-clamp-1">
                                  {activeBooking.purpose || "Sync Session"}
                                </span>
                                <span className="text-[10px] text-slate font-label-mono">
                                  {activeBooking.start_time.split(" ")[1].substring(0, 5)} - {activeBooking.end_time.split(" ")[1].substring(0, 5)}
                                </span>
                              </div>
                            ) : (
                              <div className="absolute inset-1 rounded border border-dashed border-slate/10 flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-available/5 transition-all cursor-pointer">
                                <span className="text-xs text-slate font-label-caps uppercase tracking-widest">Available Slot</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
