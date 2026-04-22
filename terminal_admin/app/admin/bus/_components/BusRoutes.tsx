"use client";

import { useMemo, useState } from "react";
export type OpsStatus = "scheduled" | "arriving" | "present" | "departed";

export type StatusFilter = OpsStatus | "all";

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
  ops_status: OpsStatus;
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

function opsBadgeClass(s: OpsStatus) {
  if (s === "departed") return "badge-neutral";
  if (s === "present") return "badge-success";
  if (s === "arriving") return "badge-warning";
  return "badge-ghost";
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [routeQuery, setRouteQuery] = useState("");

  const counts = useMemo(() => {
    const summary = { scheduled: 0, arriving: 0, present: 0, departed: 0 };
    for (const row of rows) summary[row.ops_status] += 1;
    return summary;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.ops_status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${row.route_name ?? ""} ${row.route_code ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, statusFilter, routeQuery]);

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">All buses on terminal routes</h2>
          <p className="text-sm text-base-content/70">
            Fleet state, route, driver, and latest terminal event log for today.
          </p>
        </div>
        <label className="form-control w-full max-w-xs">
          <span className="label py-0 pb-1">
            <span className="label-text text-sm">Filter by route</span>
          </span>
          <input
            type="search"
            className="input input-bordered w-full"
            placeholder="Route name or code"
            value={routeQuery}
            onChange={(e) => setRouteQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["scheduled", "Scheduled"],
            ["arriving", "Arriving"],
            ["present", "Present"],
            ["departed", "Departed"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm ${statusFilter === value ? "bg-[#0062CA] text-white" : "btn-outline"}`}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full min-w-[960px]">
          <thead>
            <tr>
              <th>Bus</th>
              <th>Plate</th>
              <th>Route</th>
              <th>Driver</th>
              <th>Fleet</th>
              <th>Last terminal log</th>
              <th>Ops status</th>
              <th>Occupancy status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-sm text-base-content/60">
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
                    <span className={`badge badge-outline capitalize ${opsBadgeClass(row.ops_status)}`}>
                      {row.ops_status}
                    </span>
                  </td>
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
        Departed: {counts.departed} · Last refresh {now ? formatTime(now.toISOString()) : "—"} (updates every 30s)
      </p>
    </div>
  );
}
