"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { RouteProps, type RouteStatus } from "./RouteProps";
import RouteTable from "./_components/RouteTable";
import AddRouteModal from "./_components/AddRoute";
import { useGetRoutes } from "./_hooks/useGetRoutes";

type ApiTerminalRef = {
  _id?: string;
  id?: string;
  terminal_name?: string;
};

type ApiRoute = {
  _id: string;
  route_name: string;
  route_code: string;
  start_location?: {
    latitude?: number | string;
    longitude?: number | string;
  } | null;
  end_location?: {
    latitude?: number | string;
    longitude?: number | string;
  } | null;
  start_terminal_id: string | ApiTerminalRef | null;
  end_terminal_id: string | ApiTerminalRef | null;
  estimated_duration?: number | null;
  status?: string;
  is_free_ride?: boolean;
  active_buses_count?: number;
  createdAt?: string;
  updatedAt?: string;
};

type RouteCounts = {
  total_routes: number;
  active_routes: number;
  inactive_routes: number;
  active_buses: number;
};

const DEFAULT_COUNTS: RouteCounts = {
  total_routes: 0,
  active_routes: 0,
  inactive_routes: 0,
  active_buses: 0,
};

function normalizeTerminalRef(ref: string | ApiTerminalRef | null | undefined) {
  if (!ref) {
    return { id: "", name: undefined as string | undefined };
  }
  if (typeof ref === "string") {
    return { id: ref, name: undefined as string | undefined };
  }
  return {
    id: String(ref._id ?? ref.id ?? ""),
    name: ref.terminal_name,
  };
}

function normalizeLocation(
  location:
    | {
        latitude?: number | string;
        longitude?: number | string;
      }
    | null
    | undefined,
) {
  if (!location) return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

function mapApiRouteToProps(route: ApiRoute): RouteProps {
  const startTerminal = normalizeTerminalRef(route.start_terminal_id);
  const endTerminal = normalizeTerminalRef(route.end_terminal_id);
  const status: RouteStatus =
    route.status === "inactive" || route.status === "suspended"
      ? route.status
      : "active";

  return {
    id: String(route._id),
    route_name: route.route_name,
    route_code: route.route_code,
    start_location: normalizeLocation(route.start_location),
    end_location: normalizeLocation(route.end_location),
    start_terminal_id: startTerminal.id,
    end_terminal_id: endTerminal.id,
    start_terminal_name: startTerminal.name,
    end_terminal_name: endTerminal.name,
    estimated_duration:
      typeof route.estimated_duration === "number" ? route.estimated_duration : null,
    is_free_ride: Boolean(route.is_free_ride),
    status,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
  };
}

const ROUTE_STATUS_OPTIONS: RouteStatus[] = ["active", "inactive", "suspended"];

export default function Route() {
  const { getRoutes, error } = useGetRoutes();
  const [routes, setRoutes] = useState<RouteProps[]>([]);
  const [routeCounts, setRouteCounts] = useState<RouteCounts>(DEFAULT_COUNTS);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RouteStatus | "all">("all");

  const fetchRoutes = useCallback(async () => {
    setRoutesLoading(true);
    const res = await getRoutes();

    if (res?.success === true && Array.isArray(res.data)) {
      setRoutes((res.data as ApiRoute[]).map(mapApiRouteToProps));
      setRouteCounts({
        total_routes: Number(res.counts?.total_routes ?? res.data.length ?? 0),
        active_routes: Number(res.counts?.active_routes ?? 0),
        inactive_routes: Number(res.counts?.inactive_routes ?? 0),
        active_buses: Number(res.counts?.active_buses ?? 0),
      });
    } else {
      setRoutes([]);
      setRouteCounts(DEFAULT_COUNTS);
    }
    setRoutesLoading(false);
  }, [getRoutes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getRoutes();
      if (cancelled) return;

      if (res?.success === true && Array.isArray(res.data)) {
        setRoutes((res.data as ApiRoute[]).map(mapApiRouteToProps));
        setRouteCounts({
          total_routes: Number(res.counts?.total_routes ?? res.data.length ?? 0),
          active_routes: Number(res.counts?.active_routes ?? 0),
          inactive_routes: Number(res.counts?.inactive_routes ?? 0),
          active_buses: Number(res.counts?.active_buses ?? 0),
        });
      } else {
        setRoutes([]);
        setRouteCounts(DEFAULT_COUNTS);
      }
      setRoutesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [getRoutes]);

  const routeSummaryCounts = useMemo(() => {
    return routeCounts;
  }, [routeCounts]);

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routes.filter((r) => {
      const matchSearch =
        !q ||
        r.route_name.toLowerCase().includes(q) ||
        r.route_code.toLowerCase().includes(q) ||
        (r.start_terminal_name?.toLowerCase().includes(q)) ||
        (r.end_terminal_name?.toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [searchQuery, statusFilter, routes]);

  const summaryCards = [
    {
      key: "total_routes",
      label: "total_routes",
      value: routeSummaryCounts.total_routes,
      accentClass: "from-primary/20 to-primary/5 border-primary/20",
      valueClass: "text-primary",
    },
    {
      key: "active_routes",
      label: "active_routes",
      value: routeSummaryCounts.active_routes,
      accentClass: "from-success/20 to-success/5 border-success/20",
      valueClass: "text-success",
    },
    {
      key: "inactive_routes",
      label: "inactive_routes",
      value: routeSummaryCounts.inactive_routes,
      accentClass: "from-warning/20 to-warning/5 border-warning/20",
      valueClass: "text-warning",
    },
    {
      key: "active_buses",
      label: "active_buses",
      value: routeSummaryCounts.active_buses,
      accentClass: "from-info/20 to-info/5 border-info/20",
      valueClass: "text-info",
    },
  ];

  return (
    <div className="space-y-4 pt-6">
      {error ? (
        <div role="alert" className="alert alert-error text-sm">
          {error}
        </div>
      ) : null}
      <div className="text-xl font-bold">Route Management Table</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className={`card border bg-linear-to-br ${card.accentClass} shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className="card-body p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-base-content/60">
                {card.label}
              </div>
              <div className={`text-3xl font-bold ${card.valueClass}`}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Search by name, code, or terminal..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-control w-40">
            <select
              className="select select-bordered w-full"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as RouteStatus | "all")
              }
            >
              <option value="all">All status</option>
              {ROUTE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-base-content/70">
            Showing {filteredRoutes.length} of {routes.length} routes
          </span>
        </div>
        <AddRouteModal onRouteAdded={fetchRoutes} />
      </div>
      {routesLoading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <RouteTable routes={filteredRoutes} onRouteUpdated={fetchRoutes} />
      )}
    </div>
  );
}
