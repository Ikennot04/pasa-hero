"use client";

import { BusProps, type AssignmentStatus, type AssignmentResult } from "../BusProps";

function BusStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-success",
    maintenance: "badge-warning",
    "out of service": "badge-error",
  };
  return (
    <span className={`badge badge-sm ${map[status] ?? "badge-ghost"}`}>
      {status}
    </span>
  );
}

function OccupancyBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    empty: "badge-ghost",
    "few seats": "badge-info",
    "standing room": "badge-warning",
    full: "badge-error",
  };
  return (
    <span className={`badge badge-sm ${map[status] ?? "badge-ghost"}`}>
      {status}
    </span>
  );
}

function AssignmentBadge({
  assignmentStatus,
  assignmentResult,
}: {
  assignmentStatus: AssignmentStatus;
  assignmentResult: AssignmentResult;
}) {
  const statusClass: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
  };
  const resultClass: Record<string, string> = {
    pending: "badge-warning",
    completed: "badge-success",
    cancelled: "badge-error",
  };
  return (
    <span className="flex flex-wrap gap-1">
      <span
        className={`badge badge-sm ${statusClass[assignmentStatus] ?? "badge-ghost"}`}
      >
        {assignmentStatus}
      </span>
      <span
        className={`badge badge-sm ${resultClass[assignmentResult] ?? "badge-ghost"}`}
      >
        {assignmentResult}
      </span>
    </span>
  );
}

export default function BusTable({ buses }: { buses: BusProps[] }) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Bus Number</th>
            <th>Plate #</th>
            <th>Capacity</th>
            <th>Bus status</th>
            <th>Current status</th>
            <th>Occupancy</th>
            <th>Driver</th>
            <th>Route</th>
            <th>Assignment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {buses.map((bus, i) => (
            <tr key={bus.id}>
              <th>{i + 1}</th>
              <td className="font-medium">{bus.bus_number}</td>
              <td>{bus.plate_number}</td>
              <td>{bus.capacity}</td>
              <td>
                <BusStatusBadge status={bus.bus_status} />
              </td>
              <td>
                <OccupancyBadge status={bus.occupancy_status} />
              </td>
              <td>
                {bus.occupancy_count} / {bus.capacity}
              </td>
              <td>{bus.driver_name}</td>
              <td>
                <span className="font-medium">{bus.route_name}</span>
                <br />
                <span className="text-xs text-base-content/60">
                  {bus.route_code}
                </span>
              </td>
              <td>
                <AssignmentBadge
                  assignmentStatus={bus.assignment_status}
                  assignmentResult={bus.assignment_result}
                />
              </td>
              <td className="flex gap-2">
                <button className="btn btn-sm">View</button>
                <button className="btn btn-sm">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
