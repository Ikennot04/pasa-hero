"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTerminalBusAssignments,
  type TerminalBusAssignmentRow,
} from "./busMonitoringMock";

const TERMINAL_NAME = "PITX";

type OpsStatus = "scheduled" | "arriving" | "present" | "departed";

type StatusFilter = OpsStatus | "all";

function sameLocalDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function operationalStatus(row: TerminalBusAssignmentRow): OpsStatus {
  if (row.departure_confirmed_at) return "departed";
  if (row.arrival_confirmed_at) return "present";
  if (row.arrival_reported_at) return "arriving";
  return "scheduled";
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

function pendingArrival(row: TerminalBusAssignmentRow) {
  return Boolean(row.arrival_reported_at && !row.arrival_confirmed_at);
}

function pendingDeparture(row: TerminalBusAssignmentRow) {
  return Boolean(row.departure_reported_at && !row.departure_confirmed_at);
}

export default function BusStatus() {
  const [rows, setRows] = useState<TerminalBusAssignmentRow[]>([]);
  const [nowIso, setNowIso] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [routeQuery, setRouteQuery] = useState("");

  useEffect(() => {
    const t0 = setTimeout(() => {
      const now = new Date();
      setRows(buildTerminalBusAssignments(now));
      setNowIso(now.toISOString());
    }, 0);
    const interval = setInterval(() => setNowIso(new Date().toISOString()), 30_000);
    return () => {
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, []);

  const now = useMemo(() => (nowIso ? new Date(nowIso) : null), [nowIso]);

  const todayRows = useMemo(() => {
    if (!now) return [];
    return rows.filter((r) => sameLocalDay(new Date(r.scheduled_arrival_at), now));
  }, [rows, now]);

  const enriched = useMemo(
    () =>
      todayRows.map((r) => ({
        row: r,
        ops: operationalStatus(r),
      })),
    [todayRows],
  );

  const filtered = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    return enriched.filter(({ row, ops }) => {
      if (statusFilter !== "all" && ops !== statusFilter) return false;
      if (!q) return true;
      const hay = `${row.route_name} ${row.route_code}`.toLowerCase();
      return hay.includes(q);
    });
  }, [enriched, statusFilter, routeQuery]);

  const counts = useMemo(() => {
    const c = { scheduled: 0, arriving: 0, present: 0, departed: 0 };
    for (const { ops } of enriched) {
      c[ops] += 1;
    }
    return c;
  }, [enriched]);

  const pendingArr = useMemo(() => enriched.filter(({ row }) => pendingArrival(row)).length, [enriched]);
  const pendingDep = useMemo(() => enriched.filter(({ row }) => pendingDeparture(row)).length, [enriched]);

  const uniqueRoutes = useMemo(() => {
    const set = new Set(todayRows.map((r) => r.route_code));
    return set.size;
  }, [todayRows]);

  return (
    <div className="space-y-6 text-[calc(1em+0.2rem)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bus status monitoring</h1>
        <p className="mt-1 max-w-3xl text-sm text-base-content/70">
          Live view of buses assigned to routes that serve <span className="font-medium">{TERMINAL_NAME}</span>.
          Operational status follows arrival and departure confirmations for today&apos;s scheduled trips.
        </p>
      </div>

      {!nowIso ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-8 text-center text-sm text-base-content/60">
          Loading bus data…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">Routes today</p>
              <p className="mt-1 text-2xl font-semibold">{uniqueRoutes}</p>
              <p className="mt-1 text-xs text-base-content/60">{todayRows.length} scheduled trips</p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">At terminal</p>
              <p className="mt-1 text-2xl font-semibold text-success">{counts.present}</p>
              <p className="mt-1 text-xs text-base-content/60">Arrival confirmed, not departed</p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">En route / queue</p>
              <p className="mt-1 text-2xl font-semibold">{counts.scheduled + counts.arriving}</p>
              <p className="mt-1 text-xs text-base-content/60">
                Scheduled {counts.scheduled} · Arriving {counts.arriving}
              </p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">Confirmations</p>
              <p className="mt-1 text-2xl font-semibold">
                {pendingArr + pendingDep > 0 ? (
                  <span className="text-warning">{pendingArr + pendingDep}</span>
                ) : (
                  <span className="text-success">0</span>
                )}
              </p>
              <p className="mt-1 text-xs text-base-content/60">
                Arrival {pendingArr} · Departure {pendingDep}
              </p>
            </div>
          </div>

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
                  <span className="label-text text-xs">Filter by route</span>
                </span>
                <input
                  type="search"
                  className="input input-bordered input-sm w-full"
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
                  className={`btn btn-sm ${statusFilter === value ? "btn-primary" : "btn-outline"}`}
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
                          <span
                            className={`badge badge-outline capitalize ${fleetBadgeClass(row.bus_fleet_status)}`}
                          >
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
                          <span className={`badge badge-outline capitalize ${opsBadgeClass(ops)}`}>
                            {ops}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {pendingArrival(row) ? (
                              <span className="badge badge-warning">Arrival confirm</span>
                            ) : null}
                            {pendingDeparture(row) ? (
                              <span className="badge badge-info">Departure confirm</span>
                            ) : null}
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
        </>
      )}
    </div>
  );
}
