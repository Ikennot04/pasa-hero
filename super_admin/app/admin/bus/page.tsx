"use client";

import { useState, useMemo, useEffect } from "react";

// PROPS
import {
  type AssignmentStatus,
  type AssignmentResult,
  type BusAssignmentRow,
  type BusProps,
} from "./BusProps";
import { useGetBusses } from "./_hooks/useGetBusses";

// COMPONENTS
import BusTable from "./_components/BusTable";
import AddBusModal from "./_components/AddBus";

type ApiBusStatusDoc = {
  occupancy_count?: number;
  occupancy_status?: string;
} | null;

type ApiBusAssignment = BusAssignmentRow;

type ApiBus = {
  _id: string;
  bus_number: string;
  plate_number: string;
  capacity: number;
  /** Operational status on the Bus model (active, maintenance, out of service). */
  status?: string;
  is_deleted?: boolean;
  /** Live occupancy record from the bus_status collection. */
  bus_status?: ApiBusStatusDoc;
  assignments?: ApiBusAssignment[];
};

function fullName(
  person?: { f_name?: string; l_name?: string } | null,
): string {
  if (!person) return "—";
  const parts = [person.f_name, person.l_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function pickPrimaryAssignment(
  assignments: ApiBusAssignment[] | undefined,
): ApiBusAssignment | null {
  if (!assignments?.length) return null;
  const active = assignments.find((a) => a.assignment_status === "active");
  return active ?? assignments[0];
}

function mapApiBusToBusProps(bus: ApiBus): BusProps {
  const primary = pickPrimaryAssignment(bus.assignments);
  const route =
    primary?.route_id && typeof primary.route_id === "object"
      ? primary.route_id
      : null;
  const driver =
    primary?.driver_id && typeof primary.driver_id === "object"
      ? primary.driver_id
      : null;
  const occ = bus.bus_status;
  return {
    id: String(bus._id),
    bus_number: bus.bus_number,
    plate_number: bus.plate_number,
    capacity: bus.capacity,
    bus_status: bus.status ?? "active",
    occupancy_count: occ?.occupancy_count ?? 0,
    occupancy_status: occ?.occupancy_status ?? "empty",
    driver_name: fullName(driver),
    route_name: route?.route_name ?? "—",
    route_code: route?.route_code ?? "—",
    assignment_status: primary?.assignment_status ?? "inactive",
    assignment_result: primary?.assignment_result ?? "pending",
    assignments: bus.assignments,
  };
}

// Matches bus_assignment.model.js enums
const BUS_STATUS_OPTIONS = ["active", "maintenance", "out of service"] as const;
const ASSIGNMENT_STATUS_OPTIONS: AssignmentStatus[] = ["active", "inactive"];
const ASSIGNMENT_RESULT_OPTIONS: AssignmentResult[] = ["pending", "completed", "cancelled"];

export default function Bus() {
  const { getBusses, error } = useGetBusses();
  const [buses, setBuses] = useState<BusProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getBusses();
      if (cancelled) return;
      if (res?.success === true && Array.isArray(res.data)) {
        const rows = (res.data as ApiBus[])
          .filter((b) => !b.is_deleted)
          .map(mapApiBusToBusProps);
        setBuses(rows);
      } else {
        setBuses([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [getBusses]);

  const [searchQuery, setSearchQuery] = useState("");
  const [busStatusFilter, setBusStatusFilter] = useState<string>("all");
  const [assignmentStatusFilter, setAssignmentStatusFilter] =
    useState<string>("all");
  const [assignmentResultFilter, setAssignmentResultFilter] =
    useState<string>("all");

  const filteredBuses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return buses.filter((bus) => {
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
    buses,
    searchQuery,
    busStatusFilter,
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
              Showing {filteredBuses.length} of {buses.length} buses
            </span>
          </div>
        </div>
        <div className="flex items-end gap-2">
        <AddBusModal />
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <BusTable buses={filteredBuses} />
      )}
    </div>
  );
}
