"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";
import AddBusStop from "./_components/AddBusStop";
import { useGetRoute } from "./_hooks/useGetRoute";
import { useGetRouteStops } from "./_hooks/useGetRouteStops";

type ApiTerminal = { terminal_name?: string } | string | null | undefined;

type ApiRouteDoc = {
  _id: string;
  route_code: string;
  route_name?: string;
  start_terminal_id?: ApiTerminal;
  end_terminal_id?: ApiTerminal;
  estimated_duration?: number;
  status?: string;
  updatedAt?: string;
  active_buses_count?: number;
};

type RouteDetail = {
  id: string;
  routeCode: string;
  startRoute: string;
  endRoute: string;
  estimatedDurationMinutes: number;
  status: string;
  activeBusesCount: number;
  updatedAt: string;
};

type RouteStopRow = {
  id: string;
  stopName: string;
  stopOrder: number;
  latitude: number;
  longitude: number;
};

type ApiRouteStop = {
  _id: string;
  stop_name: string;
  stop_order: number;
  latitude: number;
  longitude: number;
};

function terminalLabel(terminal: ApiTerminal): string {
  if (terminal && typeof terminal === "object" && "terminal_name" in terminal) {
    return String(terminal.terminal_name ?? "");
  }
  return typeof terminal === "string" ? terminal : "";
}

function mapApiRouteToDetail(route: ApiRouteDoc): RouteDetail {
  const start = terminalLabel(route.start_terminal_id);
  const end = terminalLabel(route.end_terminal_id);
  return {
    id: String(route._id),
    routeCode: route.route_code,
    startRoute: start || (route.route_name?.split("-")[0]?.trim() ?? "—"),
    endRoute: end || (route.route_name?.split("-")[1]?.trim() ?? "—"),
    estimatedDurationMinutes: route.estimated_duration ?? 0,
    status: route.status ?? "inactive",
    activeBusesCount: route.active_buses_count ?? 0,
    updatedAt: route.updatedAt ?? new Date().toISOString(),
  };
}

function mapApiStopToRow(s: ApiRouteStop): RouteStopRow {
  return {
    id: String(s._id),
    stopName: s.stop_name,
    stopOrder: s.stop_order,
    latitude: s.latitude,
    longitude: s.longitude,
  };
}

function formatTimeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function normalizeStopOrder(stops: RouteStopRow[]) {
  return stops
    .slice()
    .sort((a, b) => a.stopOrder - b.stopOrder)
    .map((stop, index) => ({ ...stop, stopOrder: index + 1 }));
}

export default function RouteDetailsPage() {
  const searchParams = useSearchParams();
  const routeId = searchParams.get("routeId");

  const { getRoute } = useGetRoute();
  const { getRouteStops } = useGetRouteStops();

  const getRouteRef = useRef(getRoute);
  const getRouteStopsRef = useRef(getRouteStops);
  useEffect(() => {
    getRouteRef.current = getRoute;
  }, [getRoute]);
  useEffect(() => {
    getRouteStopsRef.current = getRouteStops;
  }, [getRouteStops]);

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [stops, setStops] = useState<RouteStopRow[]>([]);
  const [savedStops, setSavedStops] = useState<RouteStopRow[]>([]);
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(() =>
    routeId ? "loading" : "idle",
  );

  useEffect(() => {
    if (!toast) return;
    const timeoutId = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!routeId) {
        await Promise.resolve();
        if (cancelled) return;
        setRoute(null);
        setStops([]);
        setSavedStops([]);
        setLoadState("idle");
        return;
      }

      setLoadState("loading");
      const [routeRes, stopsRes] = await Promise.all([
        getRouteRef.current(routeId),
        getRouteStopsRef.current(routeId),
      ]);
      if (cancelled) return;

      if (!routeRes?.success || !routeRes.data) {
        setLoadState("error");
        setRoute(null);
        setStops([]);
        setSavedStops([]);
        return;
      }

      setRoute(mapApiRouteToDetail(routeRes.data as ApiRouteDoc));

      const rawStops =
        stopsRes?.success && Array.isArray(stopsRes.data)
          ? (stopsRes.data as ApiRouteStop[])
          : [];
      const normalized = normalizeStopOrder(rawStops.map(mapApiStopToRow));
      setStops(normalized);
      setSavedStops(normalized);
      setLoadState("idle");
    })();

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  const activeStops = useMemo(() => normalizeStopOrder(stops), [stops]);

  const hasUnsavedOrder =
    !!routeId &&
    JSON.stringify(normalizeStopOrder(stops)) !==
      JSON.stringify(normalizeStopOrder(savedStops));

  function onDragStartStop(event: React.DragEvent<HTMLTableRowElement>, stopId: string) {
    setDraggingStopId(stopId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", stopId);
  }

  function onDropStop(event: React.DragEvent<HTMLTableRowElement>, targetStopId: string) {
    event.preventDefault();
    const sourceStopId = event.dataTransfer.getData("text/plain") || draggingStopId;
    if (!routeId || !sourceStopId || sourceStopId === targetStopId) return;
    setStops((prev) => {
      const list = normalizeStopOrder(prev);
      const fromIndex = list.findIndex((s) => s.id === sourceStopId);
      const toIndex = list.findIndex((s) => s.id === targetStopId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = list.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      return normalizeStopOrder(next);
    });
    setDraggingStopId(null);
    setDragOverStopId(null);
  }

  function onDragEndStop() {
    setDraggingStopId(null);
    setDragOverStopId(null);
  }

  async function onSaveStopOrder() {
    if (!routeId) return;
    const ordered = normalizeStopOrder(stops);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    try {
      await Promise.all(
        ordered.map((stop, index) =>
          axios.patch(`${baseUrl}/api/route-stops/${stop.id}`, {
            stop_order: index + 1,
          }),
        ),
      );
      setStops(ordered);
      setSavedStops(ordered);
      setToast("Route stop order saved.");
    } catch {
      setToast("Could not save stop order. Try again.");
    }
  }

  async function onAddRouteStop(payload: {
    stopName: string;
    latitude: number;
    longitude: number;
  }): Promise<{ ok: boolean; message: string }> {
    if (!routeId) return { ok: false, message: "Route not found." };
    const stopName = payload.stopName.trim();

    const current = normalizeStopOrder(stops);
    const duplicate = current.some(
      (stop) => stop.stopName.toLowerCase() === stopName.toLowerCase(),
    );
    if (duplicate) {
      return { ok: false, message: "This stop already exists for the route." };
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    try {
      const { data } = await axios.post(`${baseUrl}/api/route-stops`, {
        route_id: routeId,
        stop_name: stopName,
        stop_order: current.length + 1,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
      if (!data?.success || !data.data) {
        return { ok: false, message: data?.message ?? "Could not add route stop." };
      }
      const newRow = mapApiStopToRow(data.data as ApiRouteStop);
      const next = normalizeStopOrder([...current, newRow]);
      setStops(next);
      setSavedStops(next);
      return { ok: true, message: `Route stop "${stopName}" added.` };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message;
        return { ok: false, message: typeof msg === "string" ? msg : "Could not add route stop." };
      }
      return { ok: false, message: "Could not add route stop." };
    }
  }

  return (
    <div className="space-y-6 pb-6 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Route details</h1>
          <p className="text-sm text-base-content/70">
            View route profile and operational summary.
          </p>
        </div>
        <Link href="/admin/routes" className="btn bg-[#0062CA] text-white">
          <FaArrowLeft className="size-4" />
          Back to routes
        </Link>
      </div>

      {toast ? (
        <div className="alert alert-success">
          <span>{toast}</span>
        </div>
      ) : null}

      {!routeId ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-6 text-sm text-base-content/70">
          No route selected. Open this page from the routes list.
        </div>
      ) : loadState === "loading" ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-6 text-sm text-base-content/70">
          Loading route…
        </div>
      ) : loadState === "error" || !route ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-6 text-sm text-base-content/70">
          Route not found. Please go back and select a valid route.
        </div>
      ) : route ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-base-300 bg-base-100 p-3">
              <p className="text-xs uppercase tracking-wide text-base-content/60">Route code</p>
              <p className="mt-1 text-base font-semibold">{route.routeCode}</p>
            </div>
            <div className="rounded-lg border border-base-300 bg-base-100 p-3">
              <p className="text-xs uppercase tracking-wide text-base-content/60">Status</p>
              <p className="mt-1">
                <span
                  className={`badge badge-outline capitalize ${route.status === "active" ? "badge-success" : "badge-warning"}`}
                >
                  {route.status}
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-base-300 bg-base-100 p-3">
              <p className="text-xs uppercase tracking-wide text-base-content/60">Start route</p>
              <p className="mt-1 text-base font-medium">{route.startRoute}</p>
            </div>
            <div className="rounded-lg border border-base-300 bg-base-100 p-3">
              <p className="text-xs uppercase tracking-wide text-base-content/60">End route</p>
              <p className="mt-1 text-base font-medium">{route.endRoute}</p>
            </div>
            <div className="rounded-lg border border-base-300 bg-base-100 p-3">
              <p className="text-xs uppercase tracking-wide text-base-content/60">ETA</p>
              <p className="mt-1 text-base font-medium">{route.estimatedDurationMinutes} minutes</p>
            </div>
            <div className="rounded-lg border border-base-300 bg-base-100 p-3">
              <p className="text-xs uppercase tracking-wide text-base-content/60">Active buses</p>
              <p className="mt-1 text-base font-medium">{route.activeBusesCount}</p>
            </div>
          </div>

          <div className="rounded-lg border border-base-300 bg-base-100 p-3">
            <p className="text-xs uppercase tracking-wide text-base-content/60">Last updated</p>
            <p className="mt-1 text-base font-medium">{formatTimeAgo(route.updatedAt)}</p>
          </div>

          <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Route stops</h2>
                <p className="text-sm text-base-content/70">
                  Drag rows to reorder stops, then save the new order.
                </p>
              </div>
              <button
                type="button"
                className="btn bg-[#0062CA] text-white disabled:opacity-40"
                disabled={!hasUnsavedOrder}
                onClick={() => void onSaveStopOrder()}
              >
                Save order
              </button>
            </div>

            <AddBusStop
              routeId={route.id}
              activeStops={activeStops}
              onAddStop={onAddRouteStop}
              onToast={setToast}
            />

            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th className="w-20">Order</th>
                    <th>Stop name</th>
                    <th className="w-36">Coordinates</th>
                    <th className="w-40">Drag</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStops.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-sm text-base-content/60">
                        No route stops yet. Add a stop above.
                      </td>
                    </tr>
                  ) : (
                    activeStops.map((stop) => (
                      <tr
                        key={stop.id}
                        draggable
                        onDragStart={(e) => onDragStartStop(e, stop.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverStopId !== stop.id) setDragOverStopId(stop.id);
                        }}
                        onDrop={(e) => onDropStop(e, stop.id)}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          if (dragOverStopId !== stop.id) setDragOverStopId(stop.id);
                        }}
                        onDragEnd={onDragEndStop}
                        className={`cursor-move ${dragOverStopId === stop.id ? "bg-info/10" : ""}`}
                      >
                        <td className="font-semibold">{stop.stopOrder}</td>
                        <td>{stop.stopName}</td>
                        <td className="text-xs text-base-content/70">
                          {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                        </td>
                        <td className="text-sm text-base-content/70">Drag to reorder</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
