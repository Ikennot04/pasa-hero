"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BusRoutes, { type BusStatusRow } from "./_components/BusRoutes";

// Hooks imports
import { useGetBusStatuses } from "./_hooks/useGetBusStatuses";

const TERMINAL_NAME = "PITX";

type BusStatusApiResponse = {
  success: boolean;
  counts?: {
    active_buses: number;
    at_terminal: number;
    confirmations: number;
    en_route_or_queue: number;
  };
  data?: Array<{
    _id: string;
    bus_number: string | null;
    plate_number: string | null;
    route_name: string | null;
    route_code: string | null;
    driver: string | null;
    bus_status: string | null;
    last_terminal_log: {
      event_type: "arrival" | "departure";
      status: "pending" | "confirmed";
      event_time: string;
    } | null;
    occupancy_status: BusStatusRow["occupancy_status"];
  }>;
};

export default function BusStatus() {
  const { getBusStatuses } = useGetBusStatuses();
  const fetchBusStatusesRef = useRef(getBusStatuses);
  const [isLoaded, setIsLoaded] = useState(false);
  const [nowIso, setNowIso] = useState<string | null>(null);

  useEffect(() => {
    fetchBusStatusesRef.current = getBusStatuses;
  }, [getBusStatuses]);

  const [busStatusCountSummary, setBusStatusCountSummary] = useState({
    active_buses: 0,
    at_terminal: 0,
    confirmations: 0,
    en_route_or_queue: 0,
  });

  const [busStatuses, setBusStatuses] = useState<BusStatusRow[]>([]);
  useEffect(() => {
    const fetchBusStatuses = async () => {
      const response = (await fetchBusStatusesRef.current()) as BusStatusApiResponse | undefined;
      setNowIso(new Date().toISOString());

      if (response?.success) {
        setBusStatusCountSummary(
          response.counts ?? {
            active_buses: 0,
            at_terminal: 0,
            confirmations: 0,
            en_route_or_queue: 0,
          },
        );

        const mappedRows: BusStatusRow[] = (response.data ?? []).map((row) => ({
          id: row._id,
          bus_number: row.bus_number,
          plate_number: row.plate_number,
          route_name: row.route_name,
          route_code: row.route_code,
          driver: row.driver,
          bus_status: row.bus_status,
          last_terminal_log: row.last_terminal_log,
          occupancy_status: row.occupancy_status,
        }));
        setBusStatuses(mappedRows);
      } else {
        setBusStatuses([]);
      }

      setIsLoaded(true);
    };

    fetchBusStatuses();
    const interval = setInterval(fetchBusStatuses, 30_000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const now = useMemo(() => (nowIso ? new Date(nowIso) : null), [nowIso]);

  return (
    <div className="space-y-6 text-[calc(1em+0.2rem)] pt-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bus status monitoring</h1>
        <p className="mt-1 max-w-3xl text-sm text-base-content/70">
          Live view of buses assigned to routes that serve <span className="font-medium">{TERMINAL_NAME}</span>.
          Fleet state, routes, drivers, and terminal event logs refresh automatically.
        </p>
      </div>

      {!isLoaded ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-8 text-center text-sm text-base-content/60">
          Loading bus data…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">Active buses</p>
              <p className="mt-1 text-2xl font-semibold">{busStatusCountSummary.active_buses}</p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">At terminal</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-500">{busStatusCountSummary.at_terminal}</p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">In route</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-700">{busStatusCountSummary.en_route_or_queue}</p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">Pending Confirmations</p>
              <p className="mt-1 text-2xl font-semibold text-orange-700">
                {busStatusCountSummary.confirmations}
              </p>
            </div>
          </div>

          <BusRoutes rows={busStatuses} now={now} />
        </>
      )}
    </div>
  );
}
