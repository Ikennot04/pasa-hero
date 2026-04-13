"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildTerminalBusAssignments,
  type TerminalBusAssignmentRow,
} from "./busMonitoringMock";
import BusRoutes, {
  pendingArrival,
  pendingDeparture,
  type OpsStatus,
} from "./_components/BusRoutes";

// Hooks imports
import { useGetBusStatuses } from "./_hooks/useGetBusStatuses";

const TERMINAL_NAME = "PITX";

function sameLocalDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function operationalStatus(row: TerminalBusAssignmentRow): OpsStatus {
  if (row.departure_confirmed_at) return "departed";
  if (row.arrival_confirmed_at) return "present";
  if (row.arrival_reported_at) return "arriving";
  return "scheduled";
}

export default function BusStatus() {
  // Imported Hooks
  const { getBusStatuses } = useGetBusStatuses();
  const [busStatusCount, setBusStatusCount] = useState<number | null>(null);

  // Ref Hooks
  const fetchBusStatusesRef = useRef(getBusStatuses);

  // Ref Hooks UseEffect
  useEffect(() => {
    fetchBusStatusesRef.current = getBusStatuses;
  }, [getBusStatuses]);

  // Hooks UseEffect
  useEffect(() => {
    const fetchBusStatuses = async () => {
      const data = await fetchBusStatusesRef.current();
      if (data.success) {
        setBusStatusCount(typeof data.count === "number" ? data.count : 0);
      }
    };
    fetchBusStatuses();
  }, []);

  const [rows, setRows] = useState<TerminalBusAssignmentRow[]>([]);
  const [nowIso, setNowIso] = useState<string | null>(null);
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
    <div className="space-y-6 text-[calc(1em+0.2rem)] pt-4">
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
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">Active buses</p>
              <p className="mt-1 text-2xl font-semibold">{busStatusCount ?? todayRows.length}</p>
              <p className="mt-1 text-xs text-base-content/60">
                Routes {uniqueRoutes} · Scheduled trips {todayRows.length}
              </p>
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

          <BusRoutes enriched={enriched} counts={counts} now={now} />
        </>
      )}
    </div>
  );
}
