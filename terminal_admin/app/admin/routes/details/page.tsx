"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

type RouteStatus = "active" | "paused";

type RouteRow = {
  id: string;
  routeCode: string;
  startRoute: string;
  endRoute: string;
  estimatedDurationMinutes: number;
  status: RouteStatus;
  activeBusCount: number;
  tripsToday: number;
  updatedAt: string;
};

type RouteStopRow = {
  id: string;
  stopName: string;
  stopOrder: number;
  latitude: number;
  longitude: number;
};

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

const LOCAL_STORAGE_KEY = "terminal_admin_route_stops_v1";

const INITIAL_ROUTE_STOPS: Record<string, RouteStopRow[]> = {
  "r-1": [
    { id: "r1-s1", stopName: "PITX", stopOrder: 1, latitude: 14.5096, longitude: 120.9919 },
    { id: "r1-s2", stopName: "Taft Avenue", stopOrder: 2, latitude: 14.5547, longitude: 120.9988 },
    { id: "r1-s3", stopName: "Ayala", stopOrder: 3, latitude: 14.5513, longitude: 121.0244 },
    { id: "r1-s4", stopName: "NEDSA", stopOrder: 4, latitude: 14.6461, longitude: 121.0537 },
  ],
  "r-2": [
    { id: "r2-s1", stopName: "PITX", stopOrder: 1, latitude: 14.5096, longitude: 120.9919 },
    { id: "r2-s2", stopName: "Magallanes", stopOrder: 2, latitude: 14.5418, longitude: 121.0177 },
    { id: "r2-s3", stopName: "Cubao", stopOrder: 3, latitude: 14.6194, longitude: 121.0533 },
    { id: "r2-s4", stopName: "SM North EDSA", stopOrder: 4, latitude: 14.6566, longitude: 121.0309 },
  ],
  "r-3": [
    { id: "r3-s1", stopName: "PITX", stopOrder: 1, latitude: 14.5096, longitude: 120.9919 },
    { id: "r3-s2", stopName: "Quiapo", stopOrder: 2, latitude: 14.5996, longitude: 120.9845 },
    { id: "r3-s3", stopName: "Philcoa", stopOrder: 3, latitude: 14.6498, longitude: 121.0477 },
    { id: "r3-s4", stopName: "Fairview", stopOrder: 4, latitude: 14.7348, longitude: 121.0616 },
  ],
  "r-4": [
    { id: "r4-s1", stopName: "PITX", stopOrder: 1, latitude: 14.5096, longitude: 120.9919 },
    { id: "r4-s2", stopName: "Buendia", stopOrder: 2, latitude: 14.554, longitude: 121.0148 },
    { id: "r4-s3", stopName: "Recto", stopOrder: 3, latitude: 14.6048, longitude: 120.9828 },
    { id: "r4-s4", stopName: "Monumento", stopOrder: 4, latitude: 14.6579, longitude: 120.9831 },
  ],
};

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

function toMapPercent(lat: number, lng: number) {
  const minLat = 14.45;
  const maxLat = 14.8;
  const minLng = 120.9;
  const maxLng = 121.12;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
  return {
    left: `${Math.min(100, Math.max(0, x))}%`,
    top: `${Math.min(100, Math.max(0, y))}%`,
  };
}

export default function RouteDetailsPage() {
  const searchParams = useSearchParams();
  const routeId = searchParams.get("routeId");
  const [routeStopsByRouteId, setRouteStopsByRouteId] = useState<Record<string, RouteStopRow[]>>(
    () => {
      if (typeof window === "undefined") return INITIAL_ROUTE_STOPS;
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return INITIAL_ROUTE_STOPS;
        const parsed = JSON.parse(raw) as Record<string, RouteStopRow[]>;
        return { ...INITIAL_ROUTE_STOPS, ...parsed };
      } catch {
        return INITIAL_ROUTE_STOPS;
      }
    },
  );
  const [savedRouteStopsByRouteId, setSavedRouteStopsByRouteId] =
    useState<Record<string, RouteStopRow[]>>(() => routeStopsByRouteId);
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<string | null>(null);
  const [openAddStopModal, setOpenAddStopModal] = useState(false);
  const [newStopName, setNewStopName] = useState("");
  const [newStopLatitude, setNewStopLatitude] = useState<number>(14.5995);
  const [newStopLongitude, setNewStopLongitude] = useState<number>(120.9842);
  const [toast, setToast] = useState<string | null>(null);
  const addStopDialogRef = useRef<HTMLDialogElement>(null);

  const route = useMemo(
    () => INITIAL_ROUTES.find((row) => row.id === routeId) ?? null,
    [routeId],
  );

  const activeStops = route?.id ? normalizeStopOrder(routeStopsByRouteId[route.id] ?? []) : [];

  const hasUnsavedOrder =
    !!route?.id &&
    JSON.stringify(normalizeStopOrder(routeStopsByRouteId[route.id] ?? [])) !==
      JSON.stringify(normalizeStopOrder(savedRouteStopsByRouteId[route.id] ?? []));

  useEffect(() => {
    if (!toast) return;
    const timeoutId = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const dialog = addStopDialogRef.current;
    if (!dialog) return;
    if (openAddStopModal) dialog.showModal();
    else dialog.close();

    const onClose = () => setOpenAddStopModal(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [openAddStopModal]);

  function onDragStartStop(event: React.DragEvent<HTMLTableRowElement>, stopId: string) {
    setDraggingStopId(stopId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", stopId);
  }

  function onDropStop(event: React.DragEvent<HTMLTableRowElement>, targetStopId: string) {
    event.preventDefault();
    const sourceStopId = event.dataTransfer.getData("text/plain") || draggingStopId;
    if (!route?.id || !sourceStopId || sourceStopId === targetStopId) return;
    setRouteStopsByRouteId((prev) => {
      const list = normalizeStopOrder(prev[route.id] ?? []);
      const fromIndex = list.findIndex((s) => s.id === sourceStopId);
      const toIndex = list.findIndex((s) => s.id === targetStopId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = list.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      return { ...prev, [route.id]: normalizeStopOrder(next) };
    });
    setDraggingStopId(null);
    setDragOverStopId(null);
  }

  function onDragEndStop() {
    setDraggingStopId(null);
    setDragOverStopId(null);
  }

  function onSaveStopOrder() {
    if (!route?.id) return;
    setSavedRouteStopsByRouteId((prev) => {
      const next = { ...prev, [route.id]: normalizeStopOrder(routeStopsByRouteId[route.id] ?? []) };
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setToast("Route stop order saved.");
  }

  function onAddRouteStop() {
    if (!route?.id) return;
    const stopName = newStopName.trim();
    if (!stopName) {
      setToast("Please enter a stop name.");
      return;
    }

    const current = normalizeStopOrder(routeStopsByRouteId[route.id] ?? []);
    const duplicate = current.some((stop) => stop.stopName.toLowerCase() === stopName.toLowerCase());
    if (duplicate) {
      setToast("This stop already exists for the route.");
      return;
    }
    if (!Number.isFinite(newStopLatitude) || !Number.isFinite(newStopLongitude)) {
      setToast("Please select a valid location on the mini map.");
      return;
    }

    const nextStop: RouteStopRow = {
      id: `stop-${crypto.randomUUID()}`,
      stopName,
      stopOrder: current.length + 1,
      latitude: Number(newStopLatitude.toFixed(6)),
      longitude: Number(newStopLongitude.toFixed(6)),
    };

    setRouteStopsByRouteId((prev) => ({
      ...prev,
      [route.id]: [...current, nextStop],
    }));
    setNewStopName("");
    setOpenAddStopModal(false);
    setToast(`Route stop "${stopName}" added.`);
  }

  function onOpenAddStopModal() {
    if (!route?.id) return;
    const current = normalizeStopOrder(routeStopsByRouteId[route.id] ?? []);
    const last = current[current.length - 1];
    setNewStopName("");
    setNewStopLatitude(last?.latitude ?? 14.5995);
    setNewStopLongitude(last?.longitude ?? 120.9842);
    setOpenAddStopModal(true);
  }

  function onMiniMapClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const xRatio = rect.width === 0 ? 0 : x / rect.width;
    const yRatio = rect.height === 0 ? 0 : y / rect.height;

    const minLat = 14.45;
    const maxLat = 14.8;
    const minLng = 120.9;
    const maxLng = 121.12;
    const lat = maxLat - yRatio * (maxLat - minLat);
    const lng = minLng + xRatio * (maxLng - minLng);
    setNewStopLatitude(Number(lat.toFixed(6)));
    setNewStopLongitude(Number(lng.toFixed(6)));
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

      {!route ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-6 text-sm text-base-content/70">
          Route not found. Please go back and select a valid route.
        </div>
      ) : (
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
              <p className="mt-1 text-base font-medium">{route.activeBusCount}</p>
            </div>
          </div>

          <div className="rounded-lg border border-base-300 bg-base-100 p-3">
            <p className="text-xs uppercase tracking-wide text-base-content/60">Trips today</p>
            <p className="mt-1 text-base font-medium">{route.tripsToday}</p>
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
                onClick={onSaveStopOrder}
              >
                Save order
              </button>
            </div>

            <div className="mb-4">
              <button type="button" className="btn btn-outline" onClick={onOpenAddStopModal}>
                Add route stop
              </button>
            </div>

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
                  {activeStops.map((stop) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <dialog ref={addStopDialogRef} className="modal">
            <div className="modal-box w-11/12 max-w-4xl">
              <h3 className="text-xl font-bold">Add route stop</h3>
              <p className="mt-1 text-sm text-base-content/70">
                Enter the stop name and pick location from the mini map.
              </p>

              <div className="mt-4 space-y-3">
                <label className="form-control w-full">
                  <span className="label-text font-medium">Route stop name</span>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="e.g. Quezon Avenue"
                    value={newStopName}
                    onChange={(e) => setNewStopName(e.target.value)}
                  />
                </label>

                <div className="rounded-lg border border-base-300 p-3">
                  <p className="mb-2 text-sm font-medium">Mini map picker</p>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={onMiniMapClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                      }
                    }}
                    className="relative h-96 w-full cursor-crosshair overflow-hidden rounded-md border border-base-300 bg-linear-to-br from-sky-100 via-emerald-100 to-slate-200"
                    aria-label="Mini map picker"
                  >
                    <div className="absolute inset-0 opacity-40">
                      <div className="h-full w-full bg-[linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-size-[24px_24px]" />
                    </div>
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={toMapPercent(newStopLatitude, newStopLongitude)}
                    >
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-base-content/70">
                    Click anywhere on the mini map to set the stop coordinates.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text text-sm font-medium">Latitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      className="input input-bordered w-full"
                      value={newStopLatitude}
                      onChange={(e) => setNewStopLatitude(Number(e.target.value))}
                    />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text text-sm font-medium">Longitude</span>
                    <input
                      type="number"
                      step="0.000001"
                      className="input input-bordered w-full"
                      value={newStopLongitude}
                      onChange={(e) => setNewStopLongitude(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-action flex-wrap gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setOpenAddStopModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn bg-[#0062CA] text-white" onClick={onAddRouteStop}>
                  Add stop
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button type="submit" aria-label="Close">
                close
              </button>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}
