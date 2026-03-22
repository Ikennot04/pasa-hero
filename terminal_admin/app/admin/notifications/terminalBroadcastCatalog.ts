import { DEFAULT_TERMINAL_ID, DEFAULT_TERMINAL_NAME } from "./terminalNotificationsMock";

/**
 * Matches `server/modules/notification/notification.model.js` plus Mongoose timestamps.
 * `id` is the document id for React keys only — not shown in the UI.
 */
export type NotificationScope = "bus" | "route" | "terminal" | "system";
export type NotificationType = "delay" | "full" | "skipped_stop" | "info";
export type NotificationPriority = "high" | "medium" | "low";

export type NotificationFields = {
  id: string;
  sender_id: string;
  bus_id: string | null;
  route_id: string | null;
  terminal_id: string | null;
  title: string;
  message: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  scope: NotificationScope;
  createdAt: string;
  updatedAt: string;
};

/** Mock User ids aligned with `sender_id` ref:User */
export const MOCK_TERMINAL_SENDER_ID = "user-terminal-admin-1";
export const MOCK_SYSTEM_SENDER_ID = "user-system-1";

const MOCK_USER_NAMES: Record<string, string> = {
  [MOCK_TERMINAL_SENDER_ID]: "A. Reyes (Terminal Admin)",
  [MOCK_SYSTEM_SENDER_ID]: "Pasahero Operations",
};

/** Mock Terminal names for `terminal_id` ref:Terminal */
const MOCK_TERMINAL_NAMES: Record<string, string> = {
  [DEFAULT_TERMINAL_ID]: DEFAULT_TERMINAL_NAME,
};

/** Routes (ref:Route) — labels for display when API returns only ids */
export const TERMINAL_ROUTE_OPTIONS = [
  { id: "route-pitx-nedsa", name: "PITX — NEDSA" },
  { id: "route-pitx-sne", name: "PITX — SM North EDSA" },
  { id: "route-pitx-fv", name: "PITX — Fairview" },
  { id: "route-pitx-mon", name: "PITX — Monumento" },
] as const;

/** Buses (ref:Bus) */
export const TERMINAL_BUS_OPTIONS = [
  { id: "bus-1", bus_number: "01-AB" },
  { id: "bus-2", bus_number: "12C" },
  { id: "bus-3", bus_number: "13B" },
  { id: "bus-4", bus_number: "02-D" },
  { id: "bus-5", bus_number: "07E" },
  { id: "bus-6", bus_number: "09F" },
  { id: "bus-7", bus_number: "11A" },
  { id: "bus-8", bus_number: "15G" },
] as const;

const ROUTE_IDS: Set<string> = new Set(TERMINAL_ROUTE_OPTIONS.map((r) => r.id));
const BUS_IDS: Set<string> = new Set(TERMINAL_BUS_OPTIONS.map((b) => b.id));

export type NotificationTargetScope = "terminal" | "route" | "bus";

/** Populated-style label for ref:User — never returns raw id in UI */
export function senderRefLabel(senderId: string): string {
  return MOCK_USER_NAMES[senderId] ?? "Unknown user";
}

/** Populated-style label for ref:Terminal */
export function terminalRefLabel(terminalId: string | null): string {
  if (!terminalId) return "—";
  return MOCK_TERMINAL_NAMES[terminalId] ?? "Unknown terminal";
}

/** Populated-style label for ref:Route */
export function routeRefLabel(routeId: string | null): string {
  if (!routeId) return "—";
  const name = TERMINAL_ROUTE_OPTIONS.find((r) => r.id === routeId)?.name;
  return name ?? "Unknown route";
}

/** Populated-style label for ref:Bus (fleet number) */
export function busRefLabel(busId: string | null): string {
  if (!busId) return "—";
  const row = TERMINAL_BUS_OPTIONS.find((b) => b.id === busId);
  return row?.bus_number ?? "Unknown bus";
}

export function notificationVisibleAtTerminal(n: NotificationFields): boolean {
  if (n.terminal_id === DEFAULT_TERMINAL_ID) return true;
  if (n.route_id && ROUTE_IDS.has(n.route_id)) return true;
  if (n.bus_id && BUS_IDS.has(n.bus_id)) return true;
  return false;
}

export function scopeSummary(n: NotificationFields): string {
  if (n.scope === "system") return "System-wide";
  if (n.scope === "terminal") return `Terminal · ${terminalRefLabel(n.terminal_id)}`;
  if (n.scope === "route") return `Route · ${routeRefLabel(n.route_id)}`;
  if (n.scope === "bus") return `Bus · ${busRefLabel(n.bus_id)}`;
  return n.scope;
}
