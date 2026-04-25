"use client";

import { useState, useMemo, useEffect } from "react";
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

type ApiDriver = {
  _id: string;
  f_name: string;
  l_name: string;
  license_number: string;
  contact_number?: string;
  profile_image?: string;
  status?: string;
};

function mapApiDriverToProps(d: ApiDriver): DriverProps {
  const status = d.status === "inactive" ? "inactive" : "active";
  return {
    id: String(d._id),
    f_name: d.f_name,
    l_name: d.l_name,
    license_number: d.license_number,
    contact_number: d.contact_number ?? "",
    profile_image: d.profile_image,
    status,
  };
}

// Static data for assignments (matches bus_assignment.model.js)
const ASSIGNMENTS_STATIC: AssignmentProps[] = [
  {
    id: "a1",
    bus_id: "b1",
    driver_id: "1",
    operator_user_id: "op1",
    route_id: "r1",
    driver_name: "Juan Dela Cruz",
    operator_name: "Carlos Reyes",
    bus_number: "BUS-101",
    route_name: "EDSA – Monumento to PITX",
    assignment_status: "active",
    assignment_result: "pending",
    arrival_status: "arrival_pending",
    departure_status: "departed",
    arrival_confirmed_at: null,
    departure_confirmed_at: "2025-02-27T06:30:00",
  },
  {
    id: "a2",
    bus_id: "b2",
    driver_id: "2",
    operator_user_id: "op2",
    route_id: "r2",
    driver_name: "Maria Santos",
    operator_name: "Elena Torres",
    bus_number: "BUS-102",
    route_name: "Commonwealth – Fairview to SM North",
    assignment_status: "active",
    assignment_result: "pending",
    arrival_status: "arrived",
    departure_status: "departure_pending",
    arrival_confirmed_at: "2025-02-27T07:15:00",
    departure_confirmed_at: null,
  },
  {
    id: "a3",
    bus_id: "b3",
    driver_id: "3",
    operator_user_id: "op3",
    route_id: "r1",
    driver_name: "Pedro Reyes",
    operator_name: "Miguel Santos",
    bus_number: "BUS-103",
    route_name: "EDSA – Monumento to PITX",
    assignment_status: "active",
    assignment_result: "completed",
    arrival_status: "arrived",
    departure_status: "departed",
    arrival_confirmed_at: "2025-02-27T08:00:00",
    departure_confirmed_at: "2025-02-27T08:45:00",
  },
  {
    id: "a4",
    bus_id: "b4",
    driver_id: "4",
    operator_user_id: "op2",
    route_id: "r3",
    driver_name: "Ana Garcia",
    operator_name: "Elena Torres",
    bus_number: "BUS-104",
    route_name: "Quezon Ave – QC Circle to Quiapo",
    assignment_status: "inactive",
    assignment_result: "cancelled",
    arrival_status: "arrival_pending",
    departure_status: "departure_pending",
    arrival_confirmed_at: null,
    departure_confirmed_at: null,
  },
  {
    id: "a5",
    bus_id: "b5",
    driver_id: "5",
    operator_user_id: "op1",
    route_id: "r2",
    driver_name: "Roberto Mendoza",
    operator_name: "Carlos Reyes",
    bus_number: "BUS-105",
    route_name: "Commonwealth – Fairview to SM North",
    assignment_status: "active",
    assignment_result: "pending",
    arrival_status: "arrival_pending",
    departure_status: "departure_pending",
    arrival_confirmed_at: null,
    departure_confirmed_at: null,
  },
];

const ASSIGNMENT_STATUS_OPTIONS: AssignmentStatus[] = ["active", "inactive"];
const ASSIGNMENT_RESULT_OPTIONS: AssignmentResult[] = [
  "pending",
  "completed",
  "cancelled",
];

export default function Driver() {
  const { getDrivers, error } = useGetDrivers();
  const [drivers, setDrivers] = useState<DriverProps[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);

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
    return ASSIGNMENTS_STATIC.filter((a) => {
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
    assignmentSearch,
    assignmentStatusFilter,
    assignmentResultFilter,
  ]);

  return (
    <div className="space-y-4 pt-6">
      {error ? (
        <div role="alert" className="alert alert-error text-sm">
          {error}
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
        <AddDriverModal />
      </div>
      {driversLoading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <DriverTable drivers={filteredDrivers} />
      )}
      <div className="text-xl font-bold mt-10">Assignment Management Table</div>
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
          Showing {filteredAssignments.length} of {ASSIGNMENTS_STATIC.length}{" "}
          assignments
        </span>
        </div>
        <AddAssignmentModal drivers={drivers} />
      </div>
      <AssignmentsTable
        assignments={filteredAssignments}
        drivers={drivers}
      />
    </div>
  );
}
