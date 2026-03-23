"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type NewRouteForm = {
  routeCode: string;
  startRoute: string;
  endRoute: string;
  estimatedDurationMinutes: string;
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

const EMPTY_FORM: NewRouteForm = {
  routeCode: "",
  startRoute: "",
  endRoute: "",
  estimatedDurationMinutes: "",
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

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteRow[]>(INITIAL_ROUTES);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RouteStatus>("all");
  const [openAddModal, setOpenAddModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<NewRouteForm>(EMPTY_FORM);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openAddModal) dialog.showModal();
    else dialog.close();
    const onClose = () => setOpenAddModal(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [openAddModal]);

  const filteredRoutes = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return routes.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!lowered) return true;
      const haystack = `${row.routeCode} ${row.startRoute} ${row.endRoute}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [routes, query, statusFilter]);

  const stats = useMemo(() => {
    const active = routes.filter((r) => r.status === "active").length;
    const paused = routes.filter((r) => r.status === "paused").length;
    const buses = routes.reduce((acc, r) => acc + r.activeBusCount, 0);
    const trips = routes.reduce((acc, r) => acc + r.tripsToday, 0);
    return { active, paused, buses, trips };
  }, [routes]);

  function onOpenAddModal() {
    setForm(EMPTY_FORM);
    setOpenAddModal(true);
  }

  function onChange<K extends keyof NewRouteForm>(key: K, value: NewRouteForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onCreateRoute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const routeCode = form.routeCode.trim().toUpperCase();
    const startRoute = form.startRoute.trim();
    const endRoute = form.endRoute.trim();
    const estimatedDurationMinutes = Number(form.estimatedDurationMinutes);

    if (!routeCode || !startRoute || !endRoute) {
      setToast("Please complete all required route details.");
      return;
    }
    if (
      !Number.isFinite(estimatedDurationMinutes) ||
      estimatedDurationMinutes <= 0
    ) {
      setToast("ETA must be a valid positive number.");
      return;
    }
    const exists = routes.some((r) => r.routeCode.toLowerCase() === routeCode.toLowerCase());
    if (exists) {
      setToast(`Route code ${routeCode} already exists.`);
      return;
    }

    const next: RouteRow = {
      id: `route-${crypto.randomUUID()}`,
      routeCode,
      startRoute,
      endRoute,
      estimatedDurationMinutes: Math.round(estimatedDurationMinutes),
      status: "active",
      activeBusCount: 0,
      tripsToday: 0,
      updatedAt: new Date().toISOString(),
    };
    setRoutes((prev) => [next, ...prev]);
    setOpenAddModal(false);
    setToast(`Route ${routeCode} added.`);
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Route Management</h1>
          <p className="text-sm text-base-content/70">
            Manage route records, monitor route status, and quickly add new routes for terminal operations.
          </p>
        </div>
        <button type="button" className="btn bg-[#0062CA] text-white" onClick={onOpenAddModal}>
          Add route
        </button>
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

      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="form-control w-full lg:max-w-md">
            <span className="label pb-1">
              <span className="label-text text-sm">Search routes</span>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Code, start route, end route"
              className="input input-bordered w-full"
            />
          </label>

          <label className="form-control w-full lg:max-w-xs">
            <span className="label pb-1">
              <span className="label-text text-sm">Status filter</span>
            </span>
            <select
              className="select select-bordered w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | RouteStatus)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full min-w-[980px]">
            <thead>
              <tr>
                <th>Route</th>
                <th>Start route → End route</th>
                <th>ETA</th>
                <th>Status</th>
                <th>Active buses</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-base-content/60">
                    No routes found for your search/filter.
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="font-semibold">{row.routeCode}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      {row.startRoute} → {row.endRoute}
                    </td>
                    <td className="whitespace-nowrap">{row.estimatedDurationMinutes} min</td>
                    <td>
                      <span
                        className={`badge badge-outline capitalize ${row.status === "active" ? "badge-success" : "badge-warning"}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{row.activeBusCount}</td>
                    <td className="text-sm text-base-content/70">{formatTimeAgo(row.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-xl">
          <h3 className="text-xl font-bold">Add route</h3>
          <p className="mt-1 text-sm text-base-content/70">
            Create a new route profile with core operational details.
          </p>

          <form className="mt-4 space-y-3" onSubmit={onCreateRoute}>
            <div className="rounded-lg border border-base-300 p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-base-content/80">Route identity</p>
              <div className="grid grid-cols-1 gap-3">
                <label className="form-control w-full">
                  <span className="label-text font-medium">Route code</span>
                  <input
                    className="input input-bordered w-full"
                    placeholder="e.g. PITX-QC-05"
                    value={form.routeCode}
                    onChange={(e) => onChange("routeCode", e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-base-300 p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-base-content/80">Route coverage</p>
              <label className="form-control w-full">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text font-medium">Start route</span>
                    <input
                      className="input input-bordered w-full"
                      placeholder="e.g. PITX"
                      value={form.startRoute}
                      onChange={(e) => onChange("startRoute", e.target.value)}
                    />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text font-medium">End route</span>
                    <input
                      className="input input-bordered w-full"
                      placeholder="e.g. Fairview"
                      value={form.endRoute}
                      onChange={(e) => onChange("endRoute", e.target.value)}
                    />
                  </label>
                </div>
              </label>
            </div>

            <div className="rounded-lg border border-base-300 p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-base-content/80">Operations setup</p>
              <div className="grid grid-cols-1 gap-3">
                <label className="form-control w-full">
                  <span className="label-text font-medium">ETA (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    className="input input-bordered w-full"
                    value={form.estimatedDurationMinutes}
                    onChange={(e) => onChange("estimatedDurationMinutes", e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="modal-action flex-wrap gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setOpenAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn bg-[#0062CA] text-white">
                Add route
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </div>
  );
}