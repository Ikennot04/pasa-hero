"use client";

import { AssignmentProps } from "../AssignmentProps";

function StatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
    pending: "badge-warning",
    completed: "badge-success",
    cancelled: "badge-error",
    arrival_pending: "badge-warning",
    arrived: "badge-success",
    departure_pending: "badge-warning",
    departed: "badge-success",
  };
  return (
    <span className={`badge ${classMap[status] ?? "badge-ghost"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AssignmentsTable({
  assignments,
}: {
  assignments: AssignmentProps[];
}) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Driver</th>
            <th>Bus</th>
            <th>Route</th>
            <th>Status</th>
            <th>Result</th>
            <th>Arrival</th>
            <th>Departure</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center text-base-content/60 py-8">
                No assignments found.
              </td>
            </tr>
          ) : (
            assignments.map((a, i) => (
              <tr key={a.id}>
                <th>{i + 1}</th>
                <td className="font-medium">{a.driver_name}</td>
                <td>{a.bus_number}</td>
                <td>{a.route_name}</td>
                <td>
                  <StatusBadge status={a.assignment_status} />
                </td>
                <td>
                  <StatusBadge status={a.assignment_result} />
                </td>
                <td>
                  <StatusBadge status={a.arrival_status} />
                  {a.arrival_confirmed_at && (
                    <span className="ml-1 text-sm text-base-content/60 block">
                      {formatDate(a.arrival_confirmed_at)}
                    </span>
                  )}
                </td>
                <td>
                  <StatusBadge status={a.departure_status} />
                  {a.departure_confirmed_at && (
                    <span className="ml-1 text-sm text-base-content/60 block">
                      {formatDate(a.departure_confirmed_at)}
                    </span>
                  )}
                </td>
                <td className="flex gap-2 flex-wrap">
                  <button type="button" className="btn btn-sm">
                    View
                  </button>
                  <button type="button" className="btn btn-sm">
                    Edit
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
