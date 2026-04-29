export type RouteStatus = "active" | "inactive" | "suspended";

export type RouteProps = {
  id: string;
  route_name: string;
  route_code: string;
  start_location?: { latitude: number; longitude: number } | string | null;
  end_location?: { latitude: number; longitude: number } | string | null;
  start_terminal_id: string;
  end_terminal_id: string;
  start_terminal_name?: string;
  end_terminal_name?: string;
  estimated_duration: number | null;
  status: RouteStatus;
  createdAt?: string;
  updatedAt?: string;
};
