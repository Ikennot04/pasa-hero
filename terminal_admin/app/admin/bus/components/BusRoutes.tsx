"use client";

import { useMemo, useState } from "react";
import type { TerminalBusAssignmentRow } from "../busMonitoringMock";

export type OpsStatus = "scheduled" | "arriving" | "present" | "departed";

export type StatusFilter = OpsStatus | "all";

export function pendingArrival(row: TerminalBusAssignmentRow) {
  return Boolean(row.arrival_reported_at && !row.arrival_confirmed_at);
}

export function pendingDeparture(row: TerminalBusAssignmentRow) {
  return Boolean(row.departure_reported_at && !row.departure_confirmed_at);
}

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

function opsBadgeClass(s: OpsStatus) {
  if (s === "departed") return "badge-neutral";
  if (s === "present") return "badge-success";
  if (s === "arriving") return "badge-warning";
  return "badge-ghost";
}

function fleetBadgeClass(s: TerminalBusAssignmentRow["bus_fleet_status"]) {
  if (s === "active") return "badge-success";
  if (s === "maintenance") return "badge-warning";
  return "badge-error";
}

export type EnrichedAssignment = { row: TerminalBusAssignmentRow; ops: OpsStatus };

type BusRoutesProps = {
  enriched: EnrichedAssignment[];
  counts: { scheduled: number; arriving: number; present: number; departed: number };
  now: Date | null;
};

export default function BusRoutes({ enriched, counts, now }: BusRoutesProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [routeQuery, setRouteQuery] = useState("");

  const filtered = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    return enriched.filter(({ row, ops }) => {
      if (statusFilter !== "all" && ops !== statusFilter) return false;
      if (!q) return true;
      const hay = `${row.route_name} ${row.route_code}`.toLowerCase();
      return hay.includes(q);
    });
  }, [enriched, statusFilter, routeQuery]);

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">All buses on terminal routes</h2>
          <p className="text-sm text-base-content/70">
            Fleet state, route, driver, ETA, and event timestamps for today.
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
              <th>ETA (scheduled)</th>
              <th>Arrival</th>
              <th>Departure</th>
              <th>Ops status</th>
              <th>Alerts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-sm text-base-content/60">
                  No buses match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map(({ row, ops }) => (
                <tr key={row.id}>
                  <td className="font-semibold whitespace-nowrap">{row.bus_number}</td>
                  <td className="whitespace-nowrap">{row.plate_number}</td>
                  <td>
                    <div className="font-medium">{row.route_name}</div>
                    <div className="text-sm text-base-content/60">{row.route_code}</div>
                  </td>
                  <td>{row.driver_name}</td>
                  <td>
                    <span className={`badge badge-outline capitalize ${fleetBadgeClass(row.bus_fleet_status)}`}>
                      {row.bus_fleet_status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{formatDateTime(row.scheduled_arrival_at)}</td>
                  <td className="text-sm">
                    <div>Reported {formatTime(row.arrival_reported_at)}</div>
                    <div className="text-base-content/70">OK {formatTime(row.arrival_confirmed_at)}</div>
                  </td>
                  <td className="text-sm">
                    <div>Reported {formatTime(row.departure_reported_at)}</div>
                    <div className="text-base-content/70">OK {formatTime(row.departure_confirmed_at)}</div>
                  </td>
                  <td>
                    <span className={`badge badge-outline capitalize ${opsBadgeClass(ops)}`}>{ops}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {pendingArrival(row) ? <span className="badge badge-warning">Arrival confirm</span> : null}
                      {pendingDeparture(row) ? <span className="badge badge-info">Departure confirm</span> : null}
                      {!pendingArrival(row) && !pendingDeparture(row) ? (
                        <span className="text-base-content/50">—</span>
                      ) : null}
                    </div>
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
