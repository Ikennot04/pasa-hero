"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDeleteRoute } from "../_hooks/useDeleteRoute";
import EditRoute from "./EditRoute";

export type RouteStatus = "active" | "inactive" | "suspended";

export type RouteRow = {
  id: string;
  routeCode: string;
  routeName: string;
  startRoute: string;
  endRoute: string;
  status: RouteStatus;
  active_buses_count: number;
  updatedAt: string;
  route_code: string;
  route_name: string;
  start_terminal_id: string;
  start_terminal_name: string;
  end_terminal_id: string;
  end_terminal_name: string;
  start_location: string | { latitude?: number; longitude?: number };
  end_location: string | { latitude?: number; longitude?: number };
  estimated_duration?: number;
  is_free_ride?: boolean;
};

type RoutesProps = {
  routes: RouteRow[];
  onRouteUpdated?: () => void | Promise<void>;
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

export default function Routes({ routes, onRouteUpdated }: RoutesProps) {
  const { deleteRoute, error: deleteError } = useDeleteRoute();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RouteStatus>("all");
  const [routeToArchive, setRouteToArchive] = useState<RouteRow | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filteredRoutes = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return routes.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!lowered) return true;
      const haystack =
        `${row.routeCode} ${row.routeName} ${row.startRoute} ${row.endRoute}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [routes, query, statusFilter]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (routeToArchive) {
      el.showModal();
    } else {
      el.close();
    }
  }, [routeToArchive]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => {
      if (!isArchiving) {
        setRouteToArchive(null);
      }
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [isArchiving]);

  async function handleConfirmArchive() {
    if (!routeToArchive) return;
    setIsArchiving(true);
    try {
      const res = await deleteRoute(routeToArchive.id);
      if (!res?.success) {
        throw new Error(res?.message ?? deleteError ?? "Failed to archive route");
      }
      await onRouteUpdated?.();
      setRouteToArchive(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive route");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
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
            placeholder="Code, name, start or end route"
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
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full min-w-[980px]">
          <thead>
            <tr>
              <th>Route</th>
              <th>Start route → End route</th>
              <th>Status</th>
              <th>Free ride</th>
              <th>Active buses</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoutes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-base-content/60">
                  No routes found for your search/filter.
                </td>
              </tr>
            ) : (
              filteredRoutes.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.routeName ? (
                      <>
                        <div className="font-semibold">{row.routeName}</div>
                        <div className="text-sm text-base-content/60">{row.routeCode}</div>
                      </>
                    ) : (
                      <div className="font-semibold">{row.routeCode}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {row.startRoute} → {row.endRoute}
                  </td>
                  <td>
                    <span
                      className={`badge badge-outline capitalize ${
                        row.status === "active"
                          ? "badge-success"
                          : row.status === "suspended"
                            ? "badge-warning"
                            : "badge-ghost"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>{row.is_free_ride ? "Yes" : "No"}</td>
                  <td>{row.active_buses_count}</td>
                  <td className="text-sm text-base-content/70">{formatTimeAgo(row.updatedAt)}</td>
                  <td className="flex gap-2">
                    <Link
                      href={`/admin/routes/${encodeURIComponent(row.id)}`}
                      className="btn btn-sm btn-outline"
                    >
                      View details
                    </Link>
                    <EditRoute
                      route={row}
                      modalId={`edit-route-modal-${row.id}`}
                      onRouteUpdated={onRouteUpdated}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-error btn-outline"
                      onClick={() => setRouteToArchive(row)}
                      disabled={isArchiving}
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        className="modal"
        aria-labelledby="archive-route-confirm-title"
        aria-describedby="archive-route-confirm-desc"
      >
        <div className="modal-box">
          <h3 id="archive-route-confirm-title" className="font-bold text-lg">
            Archive route?
          </h3>
          <p id="archive-route-confirm-desc" className="py-4 text-base-content/80">
            Are you sure you want to archive{" "}
            <strong>{routeToArchive?.routeName || routeToArchive?.routeCode || "this route"}</strong>?
          </p>
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRouteToArchive(null)}
              disabled={isArchiving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-error"
              onClick={handleConfirmArchive}
              disabled={isArchiving}
            >
              {isArchiving ? "Archiving..." : "Archive route"}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" tabIndex={-1} aria-hidden>
            close
          </button>
        </form>
      </dialog>
    </div>
  );
}
