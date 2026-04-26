import type { DriverProps } from "../_components/drivers/DriverProps";
import type {
  AssignmentProps,
  AssignmentStatus,
  AssignmentResult,
  LastTerminalLogSummary,
  TerminalLogEventType,
  TerminalLogStatus,
} from "../_components/assignmens/AssignmentProps";

export type ApiDriver = {
  _id: string;
  f_name: string;
  l_name: string;
  license_number: string;
  contact_number?: string;
  profile_image?: string;
  status?: string;
};

export function mapApiDriverToProps(d: ApiDriver): DriverProps {
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

type ApiNameRef = { _id: string; f_name?: string; l_name?: string };
type ApiBusRef = { _id: string; bus_number?: string };
type ApiRouteRef = { _id: string; route_name?: string };

function refId(ref: unknown): string {
  if (ref != null && typeof ref === "object" && "_id" in ref) {
    return String((ref as { _id: string })._id);
  }
  return String(ref);
}

function displayFullName(u: ApiNameRef | null | undefined): string {
  if (!u) return "—";
  const n = `${u.f_name ?? ""} ${u.l_name ?? ""}`.trim();
  return n || "—";
}

type ApiTerminalRef = { _id: string; terminal_name?: string };
type ApiLatestTerminalLog = {
  _id?: string;
  terminal_id?: ApiTerminalRef | string;
  event_type?: string;
  event_time?: string;
  status?: string;
};

export type ApiBusAssignmentRow = {
  _id: string;
  operator_name?: string;
  bus_number?: string;
  route_name?: string;
  status?: string;
  result?: string;
  last_terminal_log?: ApiLatestTerminalLog | null;
  bus_id?: ApiBusRef | string;
  driver_id?: ApiNameRef | string;
  operator_user_id?: ApiNameRef | string;
  route_id?: ApiRouteRef | string;
  assignment_status?: string;
  assignment_result?: string;
  latest_terminal_log_id?: ApiLatestTerminalLog | string | null;
  createdAt?: string;
  updatedAt?: string;
};

function mapLatestTerminalLog(
  raw: ApiLatestTerminalLog | string | null | undefined,
): LastTerminalLogSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const et = raw.event_type;
  const event_type: TerminalLogEventType | null =
    et === "arrival" || et === "departure" ? et : null;
  if (!event_type || raw.event_time == null) return null;
  const term = raw.terminal_id;
  const termObj = typeof term === "object" && term ? term : null;
  const terminal_name =
    termObj?.terminal_name != null && String(termObj.terminal_name).trim() !== ""
      ? String(termObj.terminal_name)
      : "—";
  const st = raw.status;
  const log_status: TerminalLogStatus | undefined =
    st === "pending" || st === "confirmed" || st === "rejected" ? st : undefined;
  return {
    event_type,
    event_time:
      typeof raw.event_time === "string"
        ? raw.event_time
        : new Date(raw.event_time).toISOString(),
    terminal_name,
    log_status,
  };
}

export function mapApiBusAssignmentToProps(raw: ApiBusAssignmentRow): AssignmentProps {
  const bus = raw.bus_id;
  const driver = raw.driver_id;
  const operator = raw.operator_user_id;
  const route = raw.route_id;

  const assignment_status: AssignmentStatus =
    (raw.status ?? raw.assignment_status) === "inactive" ? "inactive" : "active";
  const ar = raw.result ?? raw.assignment_result;
  const assignment_result: AssignmentResult =
    ar === "completed" || ar === "cancelled" ? ar : "pending";

  const busObj = typeof bus === "object" && bus ? bus : null;
  const routeObj = typeof route === "object" && route ? route : null;
  const driverObj = typeof driver === "object" && driver ? driver : null;
  const operatorObj = typeof operator === "object" && operator ? operator : null;

  return {
    id: String(raw._id),
    bus_id: refId(bus),
    driver_id: refId(driver),
    operator_user_id: refId(operator),
    route_id: refId(route),
    driver_name: displayFullName(driverObj ?? undefined),
    operator_name:
      raw.operator_name ?? displayFullName(operatorObj ?? undefined),
    bus_number:
      raw.bus_number ??
      (busObj?.bus_number != null ? String(busObj.bus_number) : "—"),
    route_name:
      raw.route_name ??
      (routeObj?.route_name != null ? String(routeObj.route_name) : "—"),
    assignment_status,
    assignment_result,
    arrival_status: "arrival_pending",
    departure_status: "departure_pending",
    arrival_confirmed_at: null,
    departure_confirmed_at: null,
    last_terminal_log: mapLatestTerminalLog(
      raw.last_terminal_log ?? raw.latest_terminal_log_id,
    ),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
