export type AssignmentStatus = "active" | "inactive";
export type AssignmentResult = "pending" | "completed" | "cancelled";

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
};