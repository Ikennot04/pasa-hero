export type RouteStatus = "active" | "inactive" | "suspended";

export type RouteProps = {
  id: string;
  route_name: string;
  route_code: string;
  start_location?: { latitude: number; longitude: number } | null;
  end_location?: { latitude: number; longitude: number } | null;
  start_terminal_id: string;
  end_terminal_id: string;
  /** Display name (e.g. from populated ref or static data) */
  start_terminal_name?: string;
  /** Display name (e.g. from populated ref or static data) */
  end_terminal_name?: string;
  estimated_duration: number | null; // minutes
  status: RouteStatus;
  createdAt?: string;
  updatedAt?: string;
};
