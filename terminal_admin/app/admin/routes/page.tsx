"use client";

import { useMemo, useState } from "react";
import AddRoute from "./_components/AddRoute";
import Routes, { type RouteRow } from "./_components/Routes";

const INITIAL_ROUTES: RouteRow[] = [
  {
    id: "r-1",
    routeCode: "PITX-NED-01",
    startRoute: "PITX",
    endRoute: "NEDSA",
    estimatedDurationMinutes: 46,
    status: "active",
    activeBusCount: 4,
    tripsToday: 26,
    updatedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: "r-2",
    routeCode: "PITX-SNE-02",
    startRoute: "PITX",
    endRoute: "SM North EDSA",
    estimatedDurationMinutes: 52,
    status: "active",
    activeBusCount: 6,
    tripsToday: 31,
    updatedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
  },
  {
    id: "r-3",
    routeCode: "PITX-FV-03",
    startRoute: "PITX",
    endRoute: "Fairview",
    estimatedDurationMinutes: 69,
    status: "active",
    activeBusCount: 5,
    tripsToday: 23,
    updatedAt: new Date(Date.now() - 26 * 60_000).toISOString(),
  },
  {
    id: "r-4",
    routeCode: "PITX-MON-04",
    startRoute: "PITX",
    endRoute: "Monumento",
    estimatedDurationMinutes: 58,
    status: "paused",
    activeBusCount: 0,
    tripsToday: 7,
    updatedAt: new Date(Date.now() - 50 * 60_000).toISOString(),
  },
];

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteRow[]>(INITIAL_ROUTES);
  const [toast, setToast] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = routes.filter((r) => r.status === "active").length;
    const paused = routes.filter((r) => r.status === "paused").length;
    const buses = routes.reduce((acc, r) => acc + r.activeBusCount, 0);
    const trips = routes.reduce((acc, r) => acc + r.tripsToday, 0);
    return { active, paused, buses, trips };
  }, [routes]);

  return (
    <div className="space-y-6 pb-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Route Management</h1>
          <p className="text-sm text-base-content/70">
            Manage route records, monitor route status, and quickly add new routes for terminal operations.
          </p>
        </div>
        <AddRoute routes={routes} setRoutes={setRoutes} setToast={setToast} />
      </div>

      {toast ? (
        <div className="alert alert-info">
          <span>{toast}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Total routes</div>
          <div className="mt-2 text-3xl font-bold">{routes.length}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Active routes</div>
          <div className="mt-2 text-3xl font-bold text-success">{stats.active}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Paused routes</div>
          <div className="mt-2 text-3xl font-bold text-warning">{stats.paused}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Trips today</div>
          <div className="mt-2 text-3xl font-bold">{stats.trips}</div>
          <div className="text-xs text-base-content/60">{stats.buses} active buses across all routes</div>
        </div>
      </div>

      <Routes routes={routes} />
    </div>
  );
}