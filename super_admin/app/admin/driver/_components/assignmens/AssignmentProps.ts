// Matches server/modules/bus_assignment/bus_assignment.model.js

export type AssignmentStatus = "active" | "inactive";
export type AssignmentResult = "pending" | "completed" | "cancelled";
export type ArrivalStatus = "arrival_pending" | "arrived";
export type DepartureStatus = "departure_pending" | "departed";

export type TerminalLogEventType = "arrival" | "departure";
export type TerminalLogStatus = "pending" | "confirmed" | "rejected";

export type LastTerminalLogSummary = {
  event_type: TerminalLogEventType;
  event_time: string;
  terminal_name: string;
  log_status?: TerminalLogStatus;
};

export type AssignmentProps = {
  id: string;
  bus_id: string;
  driver_id: string;
  operator_user_id: string;
  route_id: string;
  // Display fields (from populated refs or join)
  driver_name: string;
  operator_name: string;
  bus_number: string;
  route_name: string;
  assignment_status: AssignmentStatus;
  assignment_result: AssignmentResult;
  arrival_status: ArrivalStatus;
  departure_status: DepartureStatus;
  arrival_confirmed_at: string | null;
  departure_confirmed_at: string | null;
  last_terminal_log: LastTerminalLogSummary | null;
  createdAt?: string;
  updatedAt?: string;
};
