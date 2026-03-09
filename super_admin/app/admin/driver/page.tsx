"use client";

import { useState, useMemo } from "react";
import { DriverProps } from "./_components/drivers/DriverProps";
import {
  AssignmentProps,
  type AssignmentStatus,
  type AssignmentResult,
} from "./_components/assignmens/AssignmentProps";
import DriverTable from "./_components/drivers/DriverTable";
import AssignmentsTable from "./_components/assignmens/AssignmentsTable";
import AddDriverModal from "./_components/drivers/AddDriver";
import AddAssignmentModal from "./_components/assignmens/AddAssignment";

// Static data for drivers (matches backend driver.model.js fields)
const DRIVERS_STATIC: DriverProps[] = [
  {
    id: "1",
    f_name: "Juan",
    l_name: "Dela Cruz",
    license_number: "DL-2024-001234",
    contact_number: "+63 912 345 6789",
    profile_image: "default.png",
    status: "active",
  },
  {
    id: "2",
    f_name: "Maria",
    l_name: "Santos",
    license_number: "DL-2024-005678",
    contact_number: "+63 917 654 3210",
    profile_image: "default.png",
    status: "active",
  },
  {
    id: "3",
    f_name: "Pedro",
    l_name: "Reyes",
    license_number: "DL-2023-009012",
    contact_number: "+63 918 111 2233",
    profile_image: "default.png",
    status: "active",
  },
  {
    id: "4",
    f_name: "Ana",
    l_name: "Garcia",
    license_number: "DL-2024-003456",
    contact_number: "+63 919 444 5566",
    profile_image: "default.png",
    status: "inactive",
  },
  {
    id: "5",
    f_name: "Roberto",
    l_name: "Mendoza",
    license_number: "DL-2023-007890",
    contact_number: "",
    profile_image: "default.png",
    status: "active",
  },
];

// Static data for assignments (matches bus_assignment.model.js)
const ASSIGNMENTS_STATIC: AssignmentProps[] = [
  {
    id: "a1",
    bus_id: "b1",
    driver_id: "1",
    operator_user_id: "op1",
    route_id: "r1",
    driver_name: "Juan Dela Cruz",
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
    operator_user_id: "op1",
    route_id: "r2",
    driver_name: "Maria Santos",
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
    operator_user_id: "op1",
    route_id: "r1",
    driver_name: "Pedro Reyes",
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
    operator_user_id: "op1",
    route_id: "r3",
    driver_name: "Ana Garcia",
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
    if (!q) return DRIVERS_STATIC;
    return DRIVERS_STATIC.filter(
      (d) =>
        d.f_name.toLowerCase().includes(q) ||
        d.l_name.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q) ||
        (d.contact_number && d.contact_number.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const filteredAssignments = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    return ASSIGNMENTS_STATIC.filter((a) => {
      const matchSearch =
        !q ||
        a.driver_name.toLowerCase().includes(q) ||
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
              Showing {filteredDrivers.length} of {DRIVERS_STATIC.length}{" "}
              drivers
            </span>
          </div>
        </div>
        <AddDriverModal />
      </div>
      <DriverTable drivers={filteredDrivers} />
      <div className="text-xl font-bold mt-10">Assignment Management Table</div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4 pb-2">
        <div className="form-control w-64">
          <input
            type="text"
            placeholder="Search driver, bus, route..."
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
        <AddAssignmentModal drivers={DRIVERS_STATIC} />
      </div>
      <AssignmentsTable
        assignments={filteredAssignments}
        drivers={DRIVERS_STATIC}
      />
    </div>
  );
}
