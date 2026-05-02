"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrivalDepartureLog,
  type EventStatus,
  type EventType,
  type ReportSource,
  type TerminalLogEvent,
} from "./_components/ArrivalDepartureLog";
import {
  useGetTerminalLogs,
  type TerminalLogsApiResponse,
} from "./_hooks/useGetTerminalLogs";

type ApiPerson = { f_name?: string; l_name?: string } | null;
type ApiBus = { bus_number?: string; plate_number?: string } | null;
type ApiRoute = { route_name?: string } | null;
type ApiAssignment = {
  scheduled_arrival_at?: string | null;
  route_id?: ApiRoute | string | null;
  operator_user_id?: ApiPerson | string | null;
} | null;

type ApiTerminalLogRow = {
  _id: string;
  event_type: EventType;
  event_time: string;
  status: EventStatus;
  auto_detected: boolean;
  confirmation_time: string | null;
  bus_id: ApiBus | string | null;
  reported_by: ApiPerson | string | null;
  confirmed_by: ApiPerson | string | null;
  bus_assignment_id?: ApiAssignment | string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function formatPerson(u: unknown): string | null {
  if (!isRecord(u)) return null;
  const fn = u.f_name;
  const ln = u.l_name;
  const parts = [
    typeof fn === "string" ? fn : "",
    typeof ln === "string" ? ln : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function toIso(d: string | Date | null | undefined): string | null {
  if (d == null) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(d).toISOString();
}

function mapApiLogToEvent(log: unknown): TerminalLogEvent | null {
  if (!isRecord(log) || log._id == null) return null;

  const row = log as unknown as ApiTerminalLogRow;
  const bus =
    row.bus_id && typeof row.bus_id === "object" ? row.bus_id : null;
  const assignment =
    row.bus_assignment_id && typeof row.bus_assignment_id === "object"
      ? row.bus_assignment_id
      : null;
  const route =
    assignment?.route_id && typeof assignment.route_id === "object"
      ? assignment.route_id
      : null;
  const operatorUser =
    assignment?.operator_user_id &&
    typeof assignment.operator_user_id === "object"
      ? assignment.operator_user_id
      : null;

  const reportedByPerson = formatPerson(row.reported_by);
  const reportedBy =
    reportedByPerson ??
    (row.auto_detected ? "System (auto-detected)" : "—");

  const confirmationIso = toIso(row.confirmation_time);
  const isRejected = row.status === "rejected";
  const isConfirmed = row.status === "confirmed";

  return {
    id: String(row._id),
    busNumber: bus?.bus_number ?? "—",
    routeName: route?.route_name ?? "—",
    operator: formatPerson(operatorUser) ?? "—",
    plateNumber: bus?.plate_number ?? "—",
    eventType: row.event_type,
    reportedAt: toIso(row.event_time) ?? new Date(0).toISOString(),
    reportedBy,
    reportSource: row.auto_detected ? "auto" : "manual",
    status: row.status,
    confirmedAt: isConfirmed ? confirmationIso : null,
    confirmedBy: isConfirmed ? formatPerson(row.confirmed_by) : null,
    rejectedAt: isRejected ? confirmationIso : null,
    rejectedBy: isRejected ? formatPerson(row.confirmed_by) : null,
    scheduledAt: assignment?.scheduled_arrival_at
      ? toIso(assignment.scheduled_arrival_at)
      : null,
  };
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

const emptyCounts = {
  totalEvents: 0,
  confirmed: 0,
  pending: 0,
  rejected: 0,
};

function normalizeFetchResult(data: TerminalLogsApiResponse): {
  events: TerminalLogEvent[];
  counts: typeof emptyCounts;
  fetchError: string | null;
} {
  if (!data.success) {
    return {
      events: [],
      counts: data.counts ?? emptyCounts,
      fetchError: data.message ?? "Failed to load terminal logs",
    };
  }
  const rawList = Array.isArray(data.data) ? data.data : [];
  const events = rawList
    .map(mapApiLogToEvent)
    .filter((e): e is TerminalLogEvent => e !== null);
  return {
    events,
    counts: data.counts ?? emptyCounts,
    fetchError: null,
  };
}

export default function TerminalLogs() {
  const { getTerminalLogs } = useGetTerminalLogs();

  const fetchTerminalLogsRef = useRef(getTerminalLogs);
  useEffect(() => {
    fetchTerminalLogsRef.current = getTerminalLogs;
  }, [getTerminalLogs]);

  const [terminalLogSummary, setTerminalLogSummary] = useState(emptyCounts);
  const [allEvents, setAllEvents] = useState<TerminalLogEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setLoadError(null);
      const data = await fetchTerminalLogsRef.current();
      if (cancelled) return;
      const { events, counts, fetchError } = normalizeFetchResult(data);
      setAllEvents(events);
      setTerminalLogSummary(counts);
      setLoadError(fetchError);
      setIsLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedEvents = useMemo(() => {
    return [...allEvents].sort(
      (a, b) =>
        new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
    );
  }, [allEvents]);

  const busOptions = useMemo(() => {
    const set = new Set(sortedEvents.map((e) => e.busNumber).filter(Boolean));
    return Array.from(set).sort();
  }, [sortedEvents]);

  const [busFilter, setBusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | EventType>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | ReportSource>("all");

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter((ev) => {
      if (busFilter && ev.busNumber !== busFilter) return false;
      if (dateFilter && toLocalDateKey(ev.reportedAt) !== dateFilter)
        return false;
      if (eventTypeFilter !== "all" && ev.eventType !== eventTypeFilter)
        return false;
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      if (sourceFilter !== "all" && ev.reportSource !== sourceFilter)
        return false;
      return true;
    });
  }, [
    sortedEvents,
    busFilter,
    dateFilter,
    eventTypeFilter,
    statusFilter,
    sourceFilter,
  ]);

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
    <div className="space-y-6 pb-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terminal Logs</h1>
          <p className="text-sm text-base-content/70">
            All arrival and departure events for this terminal. Filter by bus,
            date, type, status, or how the event was reported.
          </p>
        </div>
        <span className="badge badge-outline">This terminal only</span>
      </div>

      {loadError ? (
        <div className="alert alert-error text-sm">
          <span>{loadError}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Total events</div>
          <div className="mt-2 text-3xl font-bold">
            {terminalLogSummary.totalEvents}
          </div>
          <div className="mt-1 text-xs text-base-content/60">
            Total arrivals + departures logged
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Confirmed</div>
          <div className="mt-2 text-3xl font-bold text-green-500">
            {terminalLogSummary.confirmed}
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Pending</div>
          <div className="mt-2 text-3xl font-bold text-yellow-500">
            {terminalLogSummary.pending}
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Rejected</div>
          <div className="mt-2 text-3xl font-bold text-red-500">
            {terminalLogSummary.rejected}
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Showing (filtered)</div>
          <div className="mt-2 text-3xl font-bold text-blue-500">
            {filteredEvents.length}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Filters</h2>
          {hasActiveFilters ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={clearFilters}
            >
              Clear all
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">
              Bus
            </span>
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
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">
              Date (reported)
            </span>
            <input
              type="date"
              className="input input-bordered w-full min-h-12 text-base"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              max={todayLocalDateKey()}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">
              Event type
            </span>
            <select
              className="select select-bordered w-full min-h-12 text-base"
              value={eventTypeFilter}
              onChange={(e) =>
                setEventTypeFilter(e.target.value as "all" | EventType)
              }
            >
              <option value="all">All types</option>
              <option value="arrival">Arrival</option>
              <option value="departure">Departure</option>
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">
              Status
            </span>
            <select
              className="select select-bordered w-full min-h-12 text-base"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | EventStatus)
              }
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-1.5 text-sm font-medium text-base-content/70">
              Report source
            </span>
            <select
              className="select select-bordered w-full min-h-12 text-base"
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(e.target.value as "all" | ReportSource)
              }
            >
              <option value="all">Auto & manual</option>
              <option value="auto">Auto-detected only</option>
              <option value="manual">Manually reported only</option>
            </select>
          </label>
        </div>
      </div>

      <ArrivalDepartureLog
        key={[busFilter, dateFilter, eventTypeFilter, statusFilter, sourceFilter].join(
          "|",
        )}
        events={filteredEvents}
      />
        </>
      )}
    </div>
  );
}
