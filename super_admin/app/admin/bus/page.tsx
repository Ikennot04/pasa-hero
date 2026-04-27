"use client";

import { useState, useMemo, useEffect, useCallback } from "react";

// PROPS
import { type BusProps } from "./BusProps";
import {
  mapApiBusToBusProps,
  type ApiBus,
  BUS_STATUS_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  ASSIGNMENT_RESULT_OPTIONS,
} from "./mapApiBus";
import { useGetBusses } from "./_hooks/useGetBusses";

// COMPONENTS
import BusTable from "./_components/BusTable";
import AddBusModal from "./_components/AddBus";

export default function Bus() {
  const { getBusses, error } = useGetBusses();
  const [buses, setBuses] = useState<BusProps[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBuses = useCallback(async () => {
    setLoading(true);
    const res = await getBusses();
    if (res?.success === true && Array.isArray(res.data)) {
      const rows = (res.data as ApiBus[])
        .filter((b) => !b.is_deleted)
        .map(mapApiBusToBusProps);
      setBuses(rows);
    } else {
      setBuses([]);
    }
    setLoading(false);
  }, [getBusses]);

  useEffect(() => {
    (async () => {
      await fetchBuses();
    })();
  }, [fetchBuses]);

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
          <AddBusModal onBusAdded={fetchBuses} />
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <BusTable buses={filteredBuses} onBusUpdated={fetchBuses} />
      )}
    </div>
  );
}
