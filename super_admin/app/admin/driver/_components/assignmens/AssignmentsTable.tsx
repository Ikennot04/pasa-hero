"use client";

import Link from "next/link";
import { AssignmentProps } from "./AssignmentProps";
import type { DriverProps } from "../drivers/DriverProps";
import EditAssignmentModal from "./EditAssignment";
import { FaRegEye } from "react-icons/fa6";

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

type AssignmentsTableProps = {
  assignments: AssignmentProps[];
  drivers: DriverProps[];
  onAssignmentUpdated?: () => void;
};

export default function AssignmentsTable({
  assignments,
  drivers,
  onAssignmentUpdated,
}: AssignmentsTableProps) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Operator</th>
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
                <td className="font-medium">{a.operator_name}</td>
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
                  <Link
                    href={`/admin/driver/assignment/${a.id}`}
                    className="btn"
                  >
                    <FaRegEye className="w-5 h-5" />
                    View
                  </Link>
                  <EditAssignmentModal
                    assignment={a}
                    drivers={drivers}
                    onUpdated={onAssignmentUpdated}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
