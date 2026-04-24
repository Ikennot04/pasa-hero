import type {
  AssignmentStatus,
  AssignmentResult,
  BusAssignmentRow,
  BusProps,
} from "./BusProps";

export type ApiBusStatusDoc = {
  occupancy_count?: number;
  occupancy_status?: string;
} | null;

export type ApiBus = {
  _id: string;
  bus_number: string;
  plate_number: string;
  capacity: number;
  status?: string;
  is_deleted?: boolean;
  bus_status?: ApiBusStatusDoc;
  assignments?: BusAssignmentRow[];
};

function fullName(
  person?: { f_name?: string; l_name?: string } | null,
): string {
  if (!person) return "—";
  const parts = [person.f_name, person.l_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function pickPrimaryAssignment(
  assignments: BusAssignmentRow[] | undefined,
): BusAssignmentRow | null {
  if (!assignments?.length) return null;
  const active = assignments.find((a) => a.assignment_status === "active");
  return active ?? assignments[0];
}

export function mapApiBusToBusProps(bus: ApiBus): BusProps {
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

export const BUS_STATUS_OPTIONS = [
  "active",
  "maintenance",
  "out of service",
] as const;

export const ASSIGNMENT_STATUS_OPTIONS: AssignmentStatus[] = [
  "active",
  "inactive",
];

export const ASSIGNMENT_RESULT_OPTIONS: AssignmentResult[] = [
  "pending",
  "completed",
  "cancelled",
];
