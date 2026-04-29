"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FaRegEye } from "react-icons/fa6";
import { RouteProps } from "../RouteProps";
import { useDeleteRoute } from "../_hooks/useDeleteRoute";
import EditRoute from "./EditRoute";

function RouteStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
    suspended: "badge-warning",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-ghost"}`}>{status}</span>
  );
}

type RouteTableProps = {
  routes: RouteProps[];
  onRouteUpdated?: () => void | Promise<void>;
};

export default function RouteTable({ routes, onRouteUpdated }: RouteTableProps) {
  const { deleteRoute, error: deleteError } = useDeleteRoute();
  const [routeToArchive, setRouteToArchive] = useState<RouteProps | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

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
    <>
      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>Route Name</th>
              <th>Route Code</th>
              <th>Start Terminal</th>
              <th>End Terminal</th>
              <th>Est. Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route, i) => (
              <tr key={route.id}>
                <th>{i + 1}</th>
                <td className="font-medium">{route.route_name}</td>
                <td>
                  <code className="text-sm">{route.route_code}</code>
                </td>
                <td>
                  {route.start_terminal_name ? route.start_terminal_name : "—"}
                </td>
                <td>
                  {route.end_terminal_name ? route.end_terminal_name : "—"}
                </td>
                <td>
                  {route.estimated_duration != null
                    ? `${route.estimated_duration} min`
                    : "—"}
                </td>
                <td>
                  <RouteStatusBadge status={route.status} />
                </td>
                <td className="flex gap-2">
                  <Link href={`/admin/route/${route.id}`} className="btn">
                    <FaRegEye className="w-5 h-5" />
                    View
                  </Link>
                  <EditRoute
                    route={route}
                    modalId={`edit-route-modal-${route.id}`}
                    onRouteUpdated={onRouteUpdated}
                  />
                  <button
                    type="button"
                    className="btn btn-error btn-outline"
                    onClick={() => setRouteToArchive(route)}
                    disabled={isArchiving}
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
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
            <strong>{routeToArchive?.route_name ?? "this route"}</strong>? You can no
            longer see it in active route lists.
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
    </>
  );
}
