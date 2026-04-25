"use client";

import { useMemo, useState } from "react";
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
    arrival: "badge-success",
    departure: "badge-info",
    confirmed: "badge-success",
    rejected: "badge-error",
  };
  return (
    <span className={`badge badge-sm ${classMap[status] ?? "badge-ghost"}`}>
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

const DEFAULT_PAGE_SIZE = 10;

type AssignmentsTableProps = {
  assignments: AssignmentProps[];
  drivers: DriverProps[];
  onAssignmentUpdated?: () => void;
  pageSize?: number;
};

export default function AssignmentsTable({
  assignments,
  drivers,
  onAssignmentUpdated,
  pageSize = DEFAULT_PAGE_SIZE,
}: AssignmentsTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(assignments.length / pageSize));
  const activePage = Math.min(Math.max(1, page), totalPages);

  const pageAssignments = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return assignments.slice(start, start + pageSize);
  }, [assignments, activePage, pageSize]);

  const go = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
  };

  const pageNumbers = useMemo(() => {
    const window = 2;
    const lo = Math.max(1, activePage - window);
    const hi = Math.min(totalPages, activePage + window);
    const nums: number[] = [];
    for (let p = lo; p <= hi; p++) nums.push(p);
    return nums;
  }, [activePage, totalPages]);

  return (
    <>
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
              <th>Last terminal log</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-base-content/60 py-8">
                  No assignments found.
                </td>
              </tr>
            ) : (
              pageAssignments.map((a, i) => (
                <tr key={a.id}>
                  <th>{(activePage - 1) * pageSize + i + 1}</th>
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
                    {a.last_terminal_log ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={a.last_terminal_log.event_type}
                          />
                          {a.last_terminal_log.log_status &&
                          a.last_terminal_log.log_status !== "confirmed" ? (
                            <StatusBadge
                              status={a.last_terminal_log.log_status}
                            />
                          ) : null}
                        </div>
                        <span className="text-xs font-medium">
                          {a.last_terminal_log.terminal_name}
                        </span>
                        <span className="text-xs text-base-content/60">
                          {formatDate(a.last_terminal_log.event_time)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-base-content/60">—</span>
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

      {assignments.length > 0 ? (
        <div className="flex flex-col items-stretch gap-3 border-t border-base-content/10 bg-base-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-base-content/70">
            {(activePage - 1) * pageSize + 1}–
            {Math.min(activePage * pageSize, assignments.length)} of{" "}
            {assignments.length}
          </p>
          <div className="join flex-wrap justify-center">
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage <= 1}
              onClick={() => go(1)}
            >
              First
            </button>
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage <= 1}
              onClick={() => go(activePage - 1)}
            >
              Prev
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn join-item btn-sm ${p === activePage ? "btn-active" : ""}`}
                onClick={() => go(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => go(activePage + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => go(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
