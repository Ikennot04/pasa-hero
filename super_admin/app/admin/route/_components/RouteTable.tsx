"use client";

import { FaRegEye } from "react-icons/fa6";
import { RouteProps } from "../RouteProps";
import EditRoute from "./EditRoute";

function RouteStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
    suspended: "badge-warning",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-ghost"}`}>
      {status}
    </span>
  );
}

export default function RouteTable({ routes }: { routes: RouteProps[] }) {
  return (
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
              <td><code className="text-sm">{route.route_code}</code></td>
              <td>{route.start_terminal_name ?? route.start_terminal_id}</td>
              <td>{route.end_terminal_name ?? route.end_terminal_id}</td>
              <td>
                {route.estimated_duration != null
                  ? `${route.estimated_duration} min`
                  : "—"}
              </td>
              <td>
                <RouteStatusBadge status={route.status} />
              </td>
              <td className="flex gap-2">
                <button type="button" className="btn">
                <FaRegEye className="w-5 h-5" />
                  View
                </button>
                <EditRoute route={route} modalId={`edit-route-modal-${route.id}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
