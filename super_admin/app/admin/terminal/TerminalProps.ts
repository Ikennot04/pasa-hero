export type TerminalStatus = "active" | "inactive";

export type TerminalProps = {
  id: string;
  terminal_name: string;
  location_lat: number;
  location_lng: number;
  status: TerminalStatus;
  createdAt?: string;
  updatedAt?: string;
};

// Terminal log (matches backend terminal_log.model.js)
export type TerminalLogEventType =
  | "arrival_reported"
  | "arrival_confirmed"
  | "departure_reported"
  | "departure_confirmed"
  | "auto_detected";

export type TerminalLogStatus =
  | "pending_confirmation"
  | "confirmed"
  | "rejected";

export type TerminalLogProps = {
  id: string;
  terminal_id: string;
  bus_id: string;
  terminal_name: string;
  bus_number: string;
  event_type: TerminalLogEventType;
  status: TerminalLogStatus;
  event_time: string;
  confirmation_time: string | null;
  auto_detected: boolean;
  remarks?: string | null;
};
