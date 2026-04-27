"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { DriverProps } from "./_components/drivers/DriverProps";
import {
  AssignmentProps,
  type AssignmentStatus,
  type AssignmentResult,
} from "./_components/assignmens/AssignmentProps";
import DriverTable from "./_components/drivers/DriverTable";
import AssignmentsTable from "./_components/assignmens/AssignmentsTable";
import AddDriverModal from "./_components/drivers/AddDriver";
import AddAssignmentModal from "./_components/assignmens/AddAssignment";
import { useGetDrivers } from "./_hooks/useGetDrivers";
import { useGetBusAssignments } from "./_hooks/useGetBusAssignments";
import {
  mapApiDriverToProps,
  mapApiBusAssignmentToProps,
  type ApiDriver,
  type ApiBusAssignmentRow,
} from "./_lib/apiMappers";

const ASSIGNMENT_STATUS_OPTIONS: AssignmentStatus[] = ["active", "inactive"];
const ASSIGNMENT_RESULT_OPTIONS: AssignmentResult[] = [
  "pending",
  "completed",
  "cancelled",
];

export default function Driver() {
  const { getDrivers, error: driversError } = useGetDrivers();
  const { getBusAssignments, error: assignmentsError } = useGetBusAssignments();
  const [drivers, setDrivers] = useState<DriverProps[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentProps[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  const refreshDrivers = useCallback(async () => {
    const res = await getDrivers();
    if (res?.success === true && Array.isArray(res.data)) {
      setDrivers((res.data as ApiDriver[]).map(mapApiDriverToProps));
      return;
    }
    setDrivers([]);
  }, [getDrivers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDriversLoading(true);
      const res = await getDrivers();
      if (cancelled) return;
      if (res?.success === true && Array.isArray(res.data)) {
        setDrivers((res.data as ApiDriver[]).map(mapApiDriverToProps));
      } else {
        setDrivers([]);
      }
      setDriversLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [getDrivers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAssignmentsLoading(true);
      const res = await getBusAssignments();
      if (cancelled) return;
      if (res?.success === true && Array.isArray(res.data)) {
        setAssignments((res.data as ApiBusAssignmentRow[]).map(mapApiBusAssignmentToProps));
      } else {
        setAssignments([]);
      }
      setAssignmentsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [getBusAssignments]);

  const refreshAssignments = useCallback(async () => {
    const res = await getBusAssignments();
    if (res?.success === true && Array.isArray(res.data)) {
      setAssignments((res.data as ApiBusAssignmentRow[]).map(mapApiBusAssignmentToProps));
    }
  }, [getBusAssignments]);

  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<
    AssignmentStatus | "all"
  >("all");
  const [assignmentResultFilter, setAssignmentResultFilter] = useState<
    AssignmentResult | "all"
  >("all");

  const filteredDrivers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.f_name.toLowerCase().includes(q) ||
        d.l_name.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q) ||
        (d.contact_number && d.contact_number.toLowerCase().includes(q)),
    );
  }, [searchQuery, drivers]);

  const filteredAssignments = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    return assignments.filter((a) => {
      const matchSearch =
        !q ||
        a.operator_name.toLowerCase().includes(q) ||
        a.bus_number.toLowerCase().includes(q) ||
        a.route_name.toLowerCase().includes(q);
      const matchStatus =
        assignmentStatusFilter === "all" ||
        a.assignment_status === assignmentStatusFilter;
      const matchResult =
        assignmentResultFilter === "all" ||
        a.assignment_result === assignmentResultFilter;
      return matchSearch && matchStatus && matchResult;
    });
  }, [
    assignments,
    assignmentSearch,
    assignmentStatusFilter,
    assignmentResultFilter,
  ]);

  return (
    <div className="space-y-4 pt-6">
      {driversError ? (
        <div role="alert" className="alert alert-error text-sm">
          {driversError}
        </div>
      ) : null}
      <div className="text-xl font-bold">Drivers Management Table</div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Search by name, license, contact..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-end pb-2">
            <span className="text-sm text-base-content/70">
              Showing {filteredDrivers.length} of {drivers.length} drivers
            </span>
          </div>
        </div>
        <AddDriverModal onDriverAdded={refreshDrivers} />
      </div>
      {driversLoading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <DriverTable drivers={filteredDrivers} />
      )}
      <div className="text-xl font-bold mt-10">Assignment Management Table</div>
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
            placeholder="Search operator, bus, route..."
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
              setAssignmentStatusFilter(
                e.target.value as AssignmentStatus | "all",
              )
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
              setAssignmentResultFilter(
                e.target.value as AssignmentResult | "all",
              )
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
          Showing {filteredAssignments.length} of {assignments.length}{" "}
          assignments
        </span>
        </div>
        <AddAssignmentModal drivers={drivers} />
      </div>
      {assignmentsLoading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <AssignmentsTable
          assignments={filteredAssignments}
          drivers={drivers}
          onAssignmentUpdated={refreshAssignments}
        />
      )}
    </div>
  );
}
