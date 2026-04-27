import type {
  AssignmentResult,
  AssignmentRow,
  AssignmentStatus,
  DriverOption,
  LastTerminalLogSummary,
  TerminalLogEventType,
  TerminalLogStatus,
} from "../_components/assignmentTypes";

type ApiDriver = {
  _id: string;
  f_name: string;
  l_name: string;
  status?: string;
};

type ApiNameRef = { _id: string; f_name?: string; l_name?: string };
type ApiBusRef = { _id: string; bus_number?: string };
type ApiRouteRef = { _id: string; route_name?: string };
type ApiTerminalRef = { _id: string; terminal_name?: string };

type ApiLatestTerminalLog = {
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
  latest_terminal_log_id?: ApiLatestTerminalLog | null;
  bus_id?: ApiBusRef | string;
  driver_id?: ApiNameRef | string;
  operator_user_id?: ApiNameRef | string;
  route_id?: ApiRouteRef | string;
  assignment_status?: string;
  assignment_result?: string;
};

function refId(ref: unknown): string {
  if (ref != null && typeof ref === "object" && "_id" in ref) {
    return String((ref as { _id: string })._id);
  }
  return String(ref ?? "");
}

function displayFullName(u: ApiNameRef | null | undefined): string {
  if (!u) return "—";
  const n = `${u.f_name ?? ""} ${u.l_name ?? ""}`.trim();
  return n || "—";
}

function mapLatestTerminalLog(
  raw: ApiLatestTerminalLog | string | null | undefined,
): LastTerminalLogSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const eventTypeRaw = raw.event_type;
  const event_type: TerminalLogEventType | null =
    eventTypeRaw === "arrival" || eventTypeRaw === "departure"
      ? eventTypeRaw
      : null;
  if (!event_type || !raw.event_time) return null;

  const terminal = raw.terminal_id;
  const terminalObj = typeof terminal === "object" && terminal ? terminal : null;
  const logStatusRaw = raw.status;
  const log_status: TerminalLogStatus | undefined =
    logStatusRaw === "pending" ||
    logStatusRaw === "confirmed" ||
    logStatusRaw === "rejected"
      ? logStatusRaw
      : undefined;

  return {
    event_type,
    event_time: raw.event_time,
    terminal_name: terminalObj?.terminal_name?.trim() || "—",
    log_status,
  };
}

export function mapApiDriverToOption(d: ApiDriver): DriverOption {
  return {
    id: String(d._id),
    f_name: d.f_name,
    l_name: d.l_name,
    status: d.status === "inactive" ? "inactive" : "active",
  };
}

export function mapApiAssignmentToRow(raw: ApiBusAssignmentRow): AssignmentRow {
  const bus = raw.bus_id;
  const operator = raw.operator_user_id;
  const route = raw.route_id;
  const operatorObj = typeof operator === "object" && operator ? operator : null;
  const busObj = typeof bus === "object" && bus ? bus : null;
  const routeObj = typeof route === "object" && route ? route : null;

  const assignment_status: AssignmentStatus =
    (raw.status ?? raw.assignment_status) === "inactive" ? "inactive" : "active";
  const resultRaw = raw.result ?? raw.assignment_result;
  const assignment_result: AssignmentResult =
    resultRaw === "completed" || resultRaw === "cancelled"
      ? resultRaw
      : "pending";

  return {
    id: String(raw._id),
    bus_id: refId(raw.bus_id),
    driver_id: refId(raw.driver_id),
    operator_user_id: refId(raw.operator_user_id),
    route_id: refId(raw.route_id),
    operator_name: raw.operator_name ?? displayFullName(operatorObj),
    bus_number: raw.bus_number ?? String(busObj?.bus_number ?? "—"),
    route_name: raw.route_name ?? String(routeObj?.route_name ?? "—"),
    assignment_status,
    assignment_result,
    last_terminal_log: mapLatestTerminalLog(
      raw.last_terminal_log ?? raw.latest_terminal_log_id,
    ),
  };
}
