"use client";

import { useState, useMemo } from "react";

// PROPS
import { BusProps, type AssignmentStatus, type AssignmentResult } from "./BusProps";

// COMPONENTS
import BusTable from "./_components/BusTable";
import AddBusModal from "./_components/AddBus";

// Matches bus_assignment.model.js enums
const BUS_STATUS_OPTIONS = ["active", "maintenance", "out of service"] as const;
const ASSIGNMENT_STATUS_OPTIONS: AssignmentStatus[] = ["active", "inactive"];
const ASSIGNMENT_RESULT_OPTIONS: AssignmentResult[] = ["pending", "completed", "cancelled"];

// Static data: buses with current status and assignment (matches backend models)
const BUSES_STATIC: BusProps[] = [
  {
    id: "1",
    bus_number: "01-AB",
    plate_number: "ABC 1234",
    capacity: 45,
    bus_status: "active",
    // current status (live)
    occupancy_count: 32,
    occupancy_status: "few seats",
    // assignment
    driver_name: "Juan Dela Cruz",
    route_name: "Manila – Quezon City",
    route_code: "MNL-QC-01",
    assignment_status: "active",
    assignment_result: "pending",
  },
  {
    id: "2",
    bus_number: "12C",
    plate_number: "XYZ 5678",
    capacity: 50,
    bus_status: "active",
    occupancy_count: 50,
    occupancy_status: "full",
    driver_name: "Maria Santos",
    route_name: "Pasig – Makati",
    route_code: "PSG-MKT-02",
    assignment_status: "active",
    assignment_result: "completed",
  },
  {
    id: "3",
    bus_number: "13B",
    plate_number: "DEF 9012",
    capacity: 40,
    bus_status: "maintenance",
    occupancy_count: 0,
    occupancy_status: "empty",
    driver_name: "—",
    route_name: "—",
    route_code: "—",
    assignment_status: "inactive",
    assignment_result: "pending",
  },
  {
    id: "4",
    bus_number: "O1L",
    plate_number: "GHI 3456",
    capacity: 45,
    bus_status: "active",
    occupancy_count: 8,
    occupancy_status: "empty",
    driver_name: "Pedro Reyes",
    route_name: "Caloocan – Manila",
    route_code: "CLK-MNL-03",
    assignment_status: "active",
    assignment_result: "pending",
  },
  {
    id: "5",
    bus_number: "O1K",
    plate_number: "JKL 7890",
    capacity: 50,
    bus_status: "out of service",
    occupancy_count: 0,
    occupancy_status: "empty",
    driver_name: "—",
    route_name: "—",
    route_code: "—",
    assignment_status: "inactive",
    assignment_result: "cancelled",
  },
];

export default function Bus() {
  const [searchQuery, setSearchQuery] = useState("");
  const [busStatusFilter, setBusStatusFilter] = useState<string>("all");
  const [assignmentStatusFilter, setAssignmentStatusFilter] =
    useState<string>("all");
  const [assignmentResultFilter, setAssignmentResultFilter] =
    useState<string>("all");

  const filteredBuses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BUSES_STATIC.filter((bus) => {
      const matchSearch =
        !q ||
        bus.bus_number.toLowerCase().includes(q) ||
        bus.plate_number.toLowerCase().includes(q) ||
        bus.driver_name.toLowerCase().includes(q) ||
        bus.route_name.toLowerCase().includes(q) ||
        bus.route_code.toLowerCase().includes(q);
      const matchBusStatus =
        busStatusFilter === "all" || bus.bus_status === busStatusFilter;
      const matchAssignmentStatus =
        assignmentStatusFilter === "all" ||
        bus.assignment_status === assignmentStatusFilter;
      const matchAssignmentResult =
        assignmentResultFilter === "all" ||
        bus.assignment_result === assignmentResultFilter;
      return (
        matchSearch &&
        matchBusStatus &&
        matchAssignmentStatus &&
        matchAssignmentResult
      );
    });
  }, [
    searchQuery,
    busStatusFilter,
    assignmentStatusFilter,
    assignmentResultFilter,
  ]);

  return (
    <div className="space-y-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Bus #, plate, driver, route..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-control w-40">
            <select
              className="select select-bordered w-full"
              value={busStatusFilter}
              onChange={(e) => setBusStatusFilter(e.target.value)}
            >
              <option value="all">All bus status</option>
              {BUS_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control w-36">
            <select
              className="select select-bordered w-full"
              value={assignmentStatusFilter}
              onChange={(e) => setAssignmentStatusFilter(e.target.value)}
            >
              <option value="all">Assignment</option>
              {ASSIGNMENT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control w-36">
            <select
              className="select select-bordered w-full"
              value={assignmentResultFilter}
              onChange={(e) => setAssignmentResultFilter(e.target.value)}
            >
              <option value="all">Result</option>
              {ASSIGNMENT_RESULT_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <span className="text-sm text-base-content/70">
              Showing {filteredBuses.length} of {BUSES_STATIC.length} buses
            </span>
          </div>
        </div>
        <div className="flex items-end gap-2">
        <AddBusModal />
        </div>
      </div>
      <BusTable buses={filteredBuses} />
    </div>
  );
}
