"use client";

import { useMemo, useState } from "react";

type EventType = "arrival" | "departure";
type EventStatus = "pending" | "confirmed" | "rejected";
type ReportSource = "auto" | "manual";

type TerminalLogEvent = {
  id: string;
  busNumber: string;
  routeName: string;
  operator: string;
  plateNumber: string;
  eventType: EventType;
  /** When the event was first logged (report time). */
  reportedAt: string;
  reportedBy: string;
  reportSource: ReportSource;
  status: EventStatus;
  confirmedAt: string | null;
  confirmedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  /** Scheduled time for context (e.g. trip arrival window). */
  scheduledAt: string | null;
};

function toIsoOffset(minutesFromNow: number) {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

function buildTerminalLogEvents(): TerminalLogEvent[] {
  return [
    {
      id: "ev-01",
      busNumber: "01-AB",
      routeName: "PITX - NEDSA",
      operator: "Pasahero Express",
      plateNumber: "NAA-4192",
      eventType: "arrival",
      reportedAt: toIsoOffset(-125),
      reportedBy: "System (geofence + plate OCR)",
      reportSource: "auto",
      status: "confirmed",
      confirmedAt: toIsoOffset(-122),
      confirmedBy: "A. Reyes (Terminal Admin)",
      rejectedAt: null,
      rejectedBy: null,
      scheduledAt: toIsoOffset(-120),
    },
    {
      id: "ev-02",
      busNumber: "01-AB",
      routeName: "PITX - NEDSA",
      operator: "Pasahero Express",
      plateNumber: "NAA-4192",
      eventType: "departure",
      reportedAt: toIsoOffset(-95),
      reportedBy: "C. Aquino (Driver)",
      reportSource: "manual",
      status: "confirmed",
      confirmedAt: toIsoOffset(-93),
      confirmedBy: "M. Diaz (Dispatcher)",
      rejectedAt: null,
      rejectedBy: null,
      scheduledAt: toIsoOffset(-90),
    },
    {
      id: "ev-03",
      busNumber: "12C",
      routeName: "PITX - SM North EDSA",
      operator: "MetroLink Transit",
      plateNumber: "NBO-2514",
      eventType: "arrival",
      reportedAt: toIsoOffset(-78),
      reportedBy: "L. Guerrero (Driver)",
      reportSource: "manual",
      status: "pending",
      confirmedAt: null,
      confirmedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      scheduledAt: toIsoOffset(-75),
    },
    {
      id: "ev-04",
      busNumber: "13B",
      routeName: "PITX - Fairview",
      operator: "Pasahero Express",
      plateNumber: "NCQ-7309",
      eventType: "arrival",
      reportedAt: toIsoOffset(-58),
      reportedBy: "Terminal IoT beacon",
      reportSource: "auto",
      status: "confirmed",
      confirmedAt: toIsoOffset(-55),
      confirmedBy: "J. Ramos (Platform Marshal)",
      rejectedAt: null,
      rejectedBy: null,
      scheduledAt: toIsoOffset(-56),
    },
    {
      id: "ev-05",
      busNumber: "13B",
      routeName: "PITX - Fairview",
      operator: "Pasahero Express",
      plateNumber: "NCQ-7309",
      eventType: "departure",
      reportedAt: toIsoOffset(-15),
      reportedBy: "System (dwell timer)",
      reportSource: "auto",
      status: "pending",
      confirmedAt: null,
      confirmedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      scheduledAt: toIsoOffset(-12),
    },
    {
      id: "ev-06",
      busNumber: "07E",
      routeName: "PITX - Monumento",
      operator: "CityRide",
      plateNumber: "NDT-1187",
      eventType: "arrival",
      reportedAt: toIsoOffset(-200),
      reportedBy: "P. Velasco (Conductor)",
      reportSource: "manual",
      status: "rejected",
      confirmedAt: null,
      confirmedBy: null,
      rejectedAt: toIsoOffset(-198),
      rejectedBy: "A. Reyes (Terminal Admin)",
      scheduledAt: toIsoOffset(-190),
    },
    {
      id: "ev-07",
      busNumber: "07E",
      routeName: "PITX - Monumento",
      operator: "CityRide",
      plateNumber: "NDT-1187",
      eventType: "arrival",
      reportedAt: toIsoOffset(-185),
      reportedBy: "System (geofence + plate OCR)",
      reportSource: "auto",
      status: "confirmed",
      confirmedAt: toIsoOffset(-183),
      confirmedBy: "A. Reyes (Terminal Admin)",
      rejectedAt: null,
      rejectedBy: null,
      scheduledAt: toIsoOffset(-190),
    },
    {
      id: "ev-08",
      busNumber: "20F",
      routeName: "PITX - Alabang",
      operator: "Southline Transit",
      plateNumber: "NEM-4420",
      eventType: "departure",
      reportedAt: toIsoOffset(-310),
      reportedBy: "S. Lim (Driver)",
      reportSource: "manual",
      status: "rejected",
      confirmedAt: null,
      confirmedBy: null,
      rejectedAt: toIsoOffset(-308),
      rejectedBy: "M. Diaz (Dispatcher)",
      scheduledAt: toIsoOffset(-300),
    },
    {
      id: "ev-09",
      busNumber: "22H",
      routeName: "PITX - Bacoor",
      operator: "Southline Transit",
      plateNumber: "NFK-9021",
      eventType: "arrival",
      reportedAt: toIsoOffset(-40),
      reportedBy: "System (geofence + plate OCR)",
      reportSource: "auto",
      status: "pending",
      confirmedAt: null,
      confirmedBy: null,
      rejectedAt: null,
      rejectedBy: null,
      scheduledAt: toIsoOffset(-38),
    },
    {
      id: "ev-10",
      busNumber: "05K",
      routeName: "PITX - Ortigas",
      operator: "MetroLink Transit",
      plateNumber: "NCC-5510",
      eventType: "departure",
      reportedAt: toIsoOffset(-12),
      reportedBy: "R. Dela Cruz (Driver)",
      reportSource: "manual",
      status: "confirmed",
      confirmedAt: toIsoOffset(-10),
      confirmedBy: "J. Ramos (Platform Marshal)",
      rejectedAt: null,
      rejectedBy: null,
      scheduledAt: toIsoOffset(-8),
    },
  ];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDateKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayLocalDateKey() {
  return toLocalDateKey(new Date().toISOString());
}

function statusBadgeClass(status: EventStatus) {
  if (status === "confirmed") return "badge-success";
  if (status === "pending") return "badge-warning";
  return "badge-error";
}

function sourceBadgeClass(source: ReportSource) {
  return source === "auto" ? "badge-info" : "badge-secondary";
}

export default function TerminalLogs() {
  const allEvents = useMemo(() => {
    const list = buildTerminalLogEvents();
    return [...list].sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }, []);

  const busOptions = useMemo(() => {
    const set = new Set(allEvents.map((e) => e.busNumber));
    return Array.from(set).sort();
  }, [allEvents]);

  const [busFilter, setBusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | EventType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | ReportSource>("all");

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (busFilter && ev.busNumber !== busFilter) return false;
      if (dateFilter && toLocalDateKey(ev.reportedAt) !== dateFilter) return false;
      if (eventTypeFilter !== "all" && ev.eventType !== eventTypeFilter) return false;
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      if (sourceFilter !== "all" && ev.reportSource !== sourceFilter) return false;
      return true;
    });
  }, [allEvents, busFilter, dateFilter, eventTypeFilter, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    const pending = allEvents.filter((e) => e.status === "pending").length;
    const confirmed = allEvents.filter((e) => e.status === "confirmed").length;
    const rejected = allEvents.filter((e) => e.status === "rejected").length;
    const arrivals = allEvents.filter((e) => e.eventType === "arrival").length;
    const departures = allEvents.filter((e) => e.eventType === "departure").length;
    return { pending, confirmed, rejected, arrivals, departures, total: allEvents.length };
  }, [allEvents]);

  const clearFilters = () => {
    setBusFilter("");
    setDateFilter("");
    setEventTypeFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
  };

  const hasActiveFilters =
    Boolean(busFilter) ||
    Boolean(dateFilter) ||
    eventTypeFilter !== "all" ||
    statusFilter !== "all" ||
    sourceFilter !== "all";

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terminal Logs</h1>
          <p className="text-sm text-base-content/70">
            All arrival and departure events for this terminal. Filter by bus, date, type, status, or how the event was
            reported.
          </p>
        </div>
        <span className="badge badge-outline">This terminal only</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Total events</div>
          <div className="mt-2 text-3xl font-bold">{stats.total}</div>
          <div className="mt-1 text-xs text-base-content/60">
            {stats.arrivals} arrivals · {stats.departures} departures
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Confirmed</div>
          <div className="mt-2 text-3xl font-bold text-success">{stats.confirmed}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Pending</div>
          <div className="mt-2 text-3xl font-bold text-warning">{stats.pending}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Rejected</div>
          <div className="mt-2 text-3xl font-bold text-error">{stats.rejected}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Showing (filtered)</div>
          <div className="mt-2 text-3xl font-bold">{filteredEvents.length}</div>
        </div>
      </div>

      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Filters</h2>
          {hasActiveFilters ? (
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              Clear all
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">Bus</span>
            <select
              className="select select-bordered w-full min-h-12 text-base"
              value={busFilter}
              onChange={(e) => setBusFilter(e.target.value)}
            >
              <option value="">All buses</option>
              {busOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">Date (reported)</span>
            <input
              type="date"
              className="input input-bordered w-full min-h-12 text-base"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              max={todayLocalDateKey()}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">Event type</span>
            <select
              className="select select-bordered w-full min-h-12 text-base"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value as "all" | EventType)}
            >
              <option value="all">All types</option>
              <option value="arrival">Arrival</option>
              <option value="departure">Departure</option>
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">Status</span>
            <select
              className="select select-bordered w-full min-h-12 text-base"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | EventStatus)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">Report source</span>
            <select
              className="select select-bordered w-full min-h-12 text-base"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as "all" | ReportSource)}
            >
              <option value="all">Auto & manual</option>
              <option value="auto">Auto-detected only</option>
              <option value="manual">Manually reported only</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Arrival & departure log</h2>
          <span className="badge badge-outline">Newest first</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full min-w-[960px]">
            <thead>
              <tr>
                <th>Reported at</th>
                <th>Type</th>
                <th>Bus</th>
                <th>Route</th>
                <th>Operator / plate</th>
                <th>Report source</th>
                <th>Reported by</th>
                <th>Status</th>
                <th>Confirmed by</th>
                <th>Rejected by</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center text-base-content/60">
                    No events match your filters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td className="whitespace-nowrap font-medium">{formatDateTime(ev.reportedAt)}</td>
                    <td>
                      <span className="badge badge-outline capitalize">{ev.eventType}</span>
                    </td>
                    <td className="font-semibold">{ev.busNumber}</td>
                    <td>{ev.routeName}</td>
                    <td>
                      <div className="text-sm font-medium">{ev.operator}</div>
                      <div className="text-xs text-base-content/70">{ev.plateNumber}</div>
                    </td>
                    <td>
                      <span className={`badge badge-outline ${sourceBadgeClass(ev.reportSource)}`}>
                        {ev.reportSource === "auto" ? "Auto-detected" : "Manual"}
                      </span>
                    </td>
                    <td className="max-w-[200px] text-sm">
                      <div className="whitespace-normal">{ev.reportedBy}</div>
                    </td>
                    <td>
                      <span className={`badge badge-outline ${statusBadgeClass(ev.status)}`}>{ev.status}</span>
                    </td>
                    <td className="max-w-[200px] text-sm">
                      {ev.confirmedAt && ev.confirmedBy ? (
                        <>
                          <div className="whitespace-normal font-medium">{ev.confirmedBy}</div>
                          <div className="text-xs text-base-content/70">{formatDateTime(ev.confirmedAt)}</div>
                        </>
                      ) : (
                        <span className="text-base-content/50">—</span>
                      )}
                    </td>
                    <td className="max-w-[200px] text-sm">
                      {ev.rejectedAt && ev.rejectedBy ? (
                        <>
                          <div className="whitespace-normal font-medium">{ev.rejectedBy}</div>
                          <div className="text-xs text-base-content/70">{formatDateTime(ev.rejectedAt)}</div>
                        </>
                      ) : (
                        <span className="text-base-content/50">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-sm text-base-content/80">
                      {ev.scheduledAt ? formatDateTime(ev.scheduledAt) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
