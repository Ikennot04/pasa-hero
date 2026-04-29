"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AddRoute from "./_components/AddRoute";
import Routes, { type RouteRow, type RouteStatus } from "./_components/RoutesTable";
import { useGetRoutes } from "./_hooks/useGetRoutes";

type ApiTerminal = { terminal_name?: string } | string | null | undefined;

type ApiRouteDoc = {
  _id: string;
  route_code: string;
  route_name?: string;
  start_terminal_id?: ApiTerminal;
  end_terminal_id?: ApiTerminal;
  status?: string;
  updatedAt?: string;
  active_buses_count?: number;
};

function terminalLabel(terminal: ApiTerminal): string {
  if (terminal && typeof terminal === "object" && "terminal_name" in terminal) {
    return String(terminal.terminal_name ?? "");
  }
  return typeof terminal === "string" ? terminal : "";
}

function mapApiStatusToRow(status: string | undefined): RouteStatus {
  return status === "active" ? "active" : "paused";
}

function mapApiRouteToRow(route: ApiRouteDoc): RouteRow {
  const start = terminalLabel(route.start_terminal_id);
  const end = terminalLabel(route.end_terminal_id);
  return {
    id: String(route._id),
    routeCode: route.route_code,
    routeName: route.route_name?.trim() ?? "",
    startRoute: start || (route.route_name?.split("-")[0]?.trim() ?? "—"),
    endRoute: end || (route.route_name?.split("-")[1]?.trim() ?? "—"),
    status: mapApiStatusToRow(route.status),
    active_buses_count: route.active_buses_count ?? 0,
    updatedAt: route.updatedAt ?? new Date().toISOString(),
  };
}

export default function RoutesPage() {
  // Imported Hooks
  const { getRoutes } = useGetRoutes();

  // Ref Hooks
  const fetchRoutesRef = useRef(getRoutes);

  // Ref Hooks Effect
  useEffect(() => {
    fetchRoutesRef.current = getRoutes;
  }, [getRoutes]);

  // Route Summary Counts States
  const [routeSummaryCounts, setRouteSummaryCounts] = useState({
    total_routes: 0,
    active_routes: 0,
    inactive_routes: 0,
    active_buses: 0,
  });

  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const loadRoutes = useCallback(async () => {
    const data = await fetchRoutesRef.current();
    if (data?.success && data.counts) {
      setRouteSummaryCounts(data.counts);
    }
    if (data?.success && Array.isArray(data.data)) {
      setRoutes((data.data as ApiRouteDoc[]).map(mapApiRouteToRow));
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const handleRouteAdded = useCallback(async () => {
    await loadRoutes();
    setToast("Route added successfully. Routes table is now updated.");
  }, [loadRoutes]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  return (
    <div className="space-y-6 pb-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Route Management
          </h1>
          <p className="text-sm text-base-content/70">
            Manage route records, monitor route status, and quickly add new
            routes for terminal operations.
          </p>
        </div>
        <AddRoute onRouteAdded={handleRouteAdded} />
      </div>

      {toast ? (
        <div className="alert alert-info">
          <span>{toast}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Total routes</div>
          <div className="mt-2 text-3xl font-bold">{routeSummaryCounts.total_routes}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Active routes</div>
          <div className="mt-2 text-3xl font-bold text-success">
            {routeSummaryCounts.active_routes}
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Inactive routes</div>
          <div className="mt-2 text-3xl font-bold text-warning">
            {routeSummaryCounts.inactive_routes}
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Active buses</div>
          <div className="mt-2 text-3xl font-bold text-info">{routeSummaryCounts.active_buses}</div>
          <div className="text-xs text-base-content/60">Across all routes</div>
        </div>
      </div>

      <Routes routes={routes} />
    </div>
  );
}
