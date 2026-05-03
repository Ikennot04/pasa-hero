"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddAssignmentModal from "./_components/AddAssignment";
import AssignmentsTable from "./_components/AssignmentsTable";
import type {
  AssignmentResult,
  AssignmentRow,
  AssignmentStatus,
} from "./_components/assignmentTypes";
import { useGetAssignments } from "./_hooks/useGetAssignments";
import {
  mapApiAssignmentToRow,
  type ApiBusAssignmentRow,
} from "./_lib/apiMappers";

const ASSIGNMENT_STATUS_OPTIONS: AssignmentStatus[] = ["active", "inactive"];
const ASSIGNMENT_RESULT_OPTIONS: AssignmentResult[] = [
  "pending",
  "completed",
  "cancelled",
];

export default function AssignmentPage() {
  const { getAssignments, error: assignmentsError } = useGetAssignments();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<
    AssignmentStatus | "all"
  >("all");
  const [assignmentResultFilter, setAssignmentResultFilter] = useState<
    AssignmentResult | "all"
  >("all");

  const loadAssignments = useCallback(async () => {
    const response = await getAssignments();
    if (response?.success === true && Array.isArray(response.data)) {
      setAssignments(
        (response.data as ApiBusAssignmentRow[]).map(mapApiAssignmentToRow),
      );
      return;
    }
    setAssignments([]);
  }, [getAssignments]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setAssignmentsLoading(true);
      await loadAssignments();
      if (!cancelled) setAssignmentsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAssignments]);

  const filteredAssignments = useMemo(() => {
    const search = assignmentSearch.trim().toLowerCase();
    return assignments.filter((row) => {
      const matchSearch =
        !search ||
        row.operator_name.toLowerCase().includes(search) ||
        row.driver_name.toLowerCase().includes(search) ||
        row.plate_number.toLowerCase().includes(search) ||
        row.route_name.toLowerCase().includes(search);
      const matchStatus =
        assignmentStatusFilter === "all" ||
        row.assignment_status === assignmentStatusFilter;
      const matchResult =
        assignmentResultFilter === "all" ||
        row.assignment_result === assignmentResultFilter;

      return matchSearch && matchStatus && matchResult;
    });
  }, [
    assignmentResultFilter,
    assignmentSearch,
    assignmentStatusFilter,
    assignments,
  ]);

  return (
    <div className="space-y-4 pt-6">
      <div className="text-xl font-bold">Assignment Management Table</div>

      {assignmentsError ? (
        <div role="alert" className="alert alert-error text-sm">
          {assignmentsError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4 pb-2">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Search operator, driver, plate, route..."
              className="input input-bordered w-full"
              value={assignmentSearch}
              onChange={(e) => setAssignmentSearch(e.target.value)}
            />
          </div>
          <div className="form-control w-40">
            <select
              className="select select-bordered w-full"
              value={assignmentStatusFilter}
              onChange={(e) =>
                setAssignmentStatusFilter(e.target.value as AssignmentStatus | "all")
              }
            >
              <option value="all">Status</option>
              {ASSIGNMENT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control w-40">
            <select
              className="select select-bordered w-full"
              value={assignmentResultFilter}
              onChange={(e) =>
                setAssignmentResultFilter(e.target.value as AssignmentResult | "all")
              }
            >
              <option value="all">Result</option>
              {ASSIGNMENT_RESULT_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-base-content/70">
            Showing {filteredAssignments.length} of {assignments.length} assignments
          </span>
        </div>
        <AddAssignmentModal onAdded={loadAssignments} />
      </div>

      {assignmentsLoading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <AssignmentsTable
          assignments={filteredAssignments}
          onAssignmentUpdated={loadAssignments}
        />
      )}
    </div>
  );
}
