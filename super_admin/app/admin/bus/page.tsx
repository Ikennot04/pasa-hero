"use client";

import { useState, useMemo } from "react";

// PROPS
import { type AssignmentStatus, type AssignmentResult } from "./BusProps";
import { BUSES_STATIC } from "./busStaticData";

// COMPONENTS
import BusTable from "./_components/BusTable";
import AddBusModal from "./_components/AddBus";

// Matches bus_assignment.model.js enums
const BUS_STATUS_OPTIONS = ["active", "maintenance", "out of service"] as const;
const ASSIGNMENT_STATUS_OPTIONS: AssignmentStatus[] = ["active", "inactive"];
const ASSIGNMENT_RESULT_OPTIONS: AssignmentResult[] = ["pending", "completed", "cancelled"];

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
