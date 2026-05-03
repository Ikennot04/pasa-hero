"use client";

export type DriverStatus = "active" | "inactive";

export type DriverOption = {
  id: string;
  f_name: string;
  l_name: string;
  status: DriverStatus;
};

export type AssignmentStatus = "active" | "inactive";
export type AssignmentResult = "pending" | "completed" | "cancelled";
export type TerminalLogEventType = "arrival" | "departure";
export type TerminalLogStatus = "pending" | "confirmed" | "rejected";

export type LastTerminalLogSummary = {
  event_type: TerminalLogEventType;
  event_time: string;
  terminal_name: string;
  log_status?: TerminalLogStatus;
};

export type AssignmentRow = {
  id: string;
  bus_id: string;
  driver_id: string;
  operator_user_id: string;
  route_id: string;
  operator_name: string;
  plate_number: string;
  driver_name: string;
  route_name: string;
  assignment_status: AssignmentStatus;
  assignment_result: AssignmentResult;
  last_terminal_log: LastTerminalLogSummary | null;
};

export type AssignmentFormData = {
  driver_id: string;
  bus_id: string;
  route_id: string;
  operator_user_id: string;
};

export type AssignmentUpdateFormData = {
  assignment_status: AssignmentStatus;
  assignment_result: AssignmentResult;
};
