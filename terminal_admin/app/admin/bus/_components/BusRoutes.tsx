"use client";

import { useMemo, useState } from "react";

export type FleetStatusFilter = "all" | "active" | "maintenance" | "out of service";

export type OccupancyFilter = "all" | "empty" | "few seats" | "standing room" | "full";

type LastTerminalLog = {
  event_type: "arrival" | "departure";
  status: "pending" | "confirmed";
  event_time: string;
};

export type BusStatusRow = {
  id: string;
  bus_number: string | null;
  plate_number: string | null;
  route_name: string | null;
  route_code: string | null;
  driver: string | null;
  bus_status: string | null;
  last_terminal_log: LastTerminalLog | null;
  occupancy_status: "empty" | "few seats" | "standing room" | "full" | null;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLastTerminalLog(row: BusStatusRow) {
  if (!row.last_terminal_log) return "—";
  const label =
    row.last_terminal_log.event_type === "arrival"
      ? row.last_terminal_log.status === "confirmed"
        ? "Arrival confirmed"
        : "Arrival reported"
      : row.last_terminal_log.status === "confirmed"
        ? "Departure confirmed"
        : "Departure reported";

  return `${label} ${formatDateTime(row.last_terminal_log.event_time)}`;
}

function rowSearchHaystack(row: BusStatusRow) {
  return [
    row.bus_number,
    row.plate_number,
    row.route_name,
    row.route_code,
    row.driver,
    getLastTerminalLog(row),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function fleetBadgeClass(s: string | null) {
  if (s === "active") return "badge-success";
  if (s === "maintenance") return "badge-warning";
  if (s === "out of service") return "badge-error";
  return "badge-error";
}

function occupancyBadgeClass(status: string) {
  if (status === "full") return "badge-error";
  if (status === "standing room") return "badge-warning";
  if (status === "few seats") return "badge-warning";
  return "badge-success";
}

type BusRoutesProps = {
  rows: BusStatusRow[];
  now: Date | null;
};

export default function BusRoutes({ rows, now }: BusRoutesProps) {
  const [fleetFilter, setFleetFilter] = useState<FleetStatusFilter>("all");
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fleetCounts = useMemo(() => {
    const summary = { active: 0, maintenance: 0, "out of service": 0, unknown: 0 };
    for (const row of rows) {
      const s = row.bus_status;
      if (s === "active") summary.active += 1;
      else if (s === "maintenance") summary.maintenance += 1;
      else if (s === "out of service") summary["out of service"] += 1;
      else summary.unknown += 1;
    }
    return summary;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (fleetFilter !== "all" && row.bus_status !== fleetFilter) return false;
      if (occupancyFilter !== "all") {
        const occ = row.occupancy_status ?? "empty";
        if (occ !== occupancyFilter) return false;
      }
      if (!q) return true;
      return rowSearchHaystack(row).includes(q);
    });
  }, [rows, fleetFilter, occupancyFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || fleetFilter !== "all" || occupancyFilter !== "all";

  function clearFilters() {
    setSearchQuery("");
    setFleetFilter("all");
    setOccupancyFilter("all");
  }

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">All buses on terminal routes</h2>
          <p className="text-sm text-base-content/70">
            Fleet state, route, driver, and latest terminal event log for today.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-base-300 bg-base-200/40 p-4">
        <div className="flex min-w-0 flex-nowrap items-center gap-3 overflow-x-auto pb-0.5 sm:gap-4">
          <div className="relative min-w-44 flex-1 sm:min-w-48">
            <span
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-base-content/45 sm:left-3.5"
              aria-hidden
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              id="bus-routes-search"
              type="search"
              className="input input-bordered input-md w-full pl-11 pr-11 sm:input-lg sm:pl-12 sm:pr-12"
              placeholder="Search bus, plate, route, driver…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              aria-label="Search buses"
            />
            {searchQuery ? (
              <button
                type="button"
                className="btn btn-ghost btn-square btn-sm absolute right-1 top-1/2 z-10 h-9 min-h-9 w-9 -translate-y-1/2 sm:right-1.5 sm:h-10 sm:min-h-10 sm:w-10"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>

          <select
            id="bus-routes-fleet"
            className="select select-bordered select-md w-40 shrink-0 sm:w-48"
            value={fleetFilter}
            onChange={(e) => setFleetFilter(e.target.value as FleetStatusFilter)}
            aria-label="Fleet status"
          >
            <option value="all">All fleet</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="out of service">Out of service</option>
          </select>

          <select
            id="bus-routes-occupancy"
            className="select select-bordered select-md w-40 shrink-0 sm:w-48"
            value={occupancyFilter}
            onChange={(e) => setOccupancyFilter(e.target.value as OccupancyFilter)}
            aria-label="Occupancy"
          >
            <option value="all">All occupancy</option>
            <option value="empty">Empty</option>
            <option value="few seats">Few seats</option>
            <option value="standing room">Standing room</option>
            <option value="full">Full</option>
          </select>

          {hasActiveFilters ? (
            <button
              type="button"
              className="btn btn-ghost shrink-0 whitespace-nowrap"
              onClick={clearFilters}
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full min-w-[960px]">
          <thead>
            <tr>
              <th>Bus</th>
              <th>Plate</th>
              <th>Route</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Last terminal log</th>
              <th>Occupancy status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-base-content/60">
                  No buses match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold whitespace-nowrap">{row.bus_number ?? "—"}</td>
                  <td className="whitespace-nowrap">{row.plate_number ?? "—"}</td>
                  <td>
                    <div className="font-medium">{row.route_name ?? "—"}</div>
                    <div className="text-sm text-base-content/60">{row.route_code ?? "—"}</div>
                  </td>
                  <td>{row.driver ?? "—"}</td>
                  <td>
                    <span className={`badge badge-outline capitalize ${fleetBadgeClass(row.bus_status)}`}>
                      {row.bus_status ?? "unknown"}
                    </span>
                  </td>
                  <td className="text-sm whitespace-nowrap">{getLastTerminalLog(row)}</td>
                  <td>
                    <span
                      className={`badge badge-outline capitalize ${occupancyBadgeClass(row.occupancy_status ?? "empty")}`}
                    >
                      {row.occupancy_status ?? "empty"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-base-content/50">
        {filtered.length === rows.length ? (
          <span>{rows.length} buses</span>
        ) : (
          <span>
            Showing {filtered.length} of {rows.length} buses
          </span>
        )}
        <span className="mx-1.5">·</span>
        Fleet: active {fleetCounts.active} · maintenance {fleetCounts.maintenance} · out of service{" "}
        {fleetCounts["out of service"]}
        {fleetCounts.unknown > 0 ? ` · unknown ${fleetCounts.unknown}` : ""}
        <span className="mx-1.5">·</span>
        Last refresh {now ? formatTime(now.toISOString()) : "—"} (updates every 30s)
      </p>
    </div>
  );
}
