export type AssignmentStatus = "active" | "inactive";
export type AssignmentResult = "pending" | "completed" | "cancelled";

/** Populated bus assignment row as returned by GET /api/busses */
export type BusAssignmentRow = {
  _id: string;
  bus_id: string;
  driver_id?: { _id?: string; f_name?: string; l_name?: string } | string;
  operator_user_id?: {
    _id?: string;
    f_name?: string;
    l_name?: string;
    email?: string;
  } | string;
  route_id?: {
    _id?: string;
    route_name?: string;
    route_code?: string;
  } | string;
  assignment_status: AssignmentStatus;
  assignment_result: AssignmentResult;
  latest_terminal_log_id?: string | null;
  scheduled_arrival_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BusProps = {
  id: string;
  bus_number: string;
  plate_number: string;
  capacity: number;
  bus_status: string;
  occupancy_count: number;
  occupancy_status: string;
  driver_name: string;
  route_name: string;
  route_code: string;
  assignment_status: AssignmentStatus;
  assignment_result: AssignmentResult;
  assignments?: BusAssignmentRow[];
};