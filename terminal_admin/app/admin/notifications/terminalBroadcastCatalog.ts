import { DEFAULT_TERMINAL_ID, DEFAULT_TERMINAL_NAME } from "./terminalNotificationsMock";

/**
 * Matches `server/modules/notification/notification.model.js` plus Mongoose timestamps.
 * `id` is the document id for React keys only — not shown in the UI.
 */
export type NotificationScope = "bus" | "route" | "terminal" | "system";
export type NotificationType =
  | "delay"
  | "full"
  | "skipped_stop"
  | "info"
  | "arrival_reported"
  | "arrival_confirmed"
  | "departure_reported"
  | "departure_confirmed"
  | "other"
  | "custom";
export type NotificationPriority = "high" | "medium" | "low";

export type PopulatedSender = { _id: string; f_name?: string; l_name?: string };
export type PopulatedTerminal = { _id: string; terminal_name?: string };
export type PopulatedRoute = {
  _id: string;
  route_name?: string;
  route_code?: string;
};
export type PopulatedBus = { _id: string; bus_number?: string; plate_number?: string };

export type NotificationFields = {
  id: string;
  sender_id: string | PopulatedSender;
  bus_id: string | PopulatedBus | null;
  route_id: string | PopulatedRoute | null;
  terminal_id: string | PopulatedTerminal | null;
  title: string;
  message: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  scope: NotificationScope;
  createdAt: string;
  updatedAt: string;
};

/** Raw document from `GET /api/notifications/terminal/:id` before normalizing `id`. */
export type NotificationApiRecord = Omit<NotificationFields, "id"> & { _id: string };

export function normalizeNotification(doc: NotificationApiRecord): NotificationFields {
  return {
    id: String(doc._id),
    sender_id: doc.sender_id,
    bus_id: doc.bus_id,
    route_id: doc.route_id,
    terminal_id: doc.terminal_id,
    title: doc.title,
    message: doc.message,
    notification_type: doc.notification_type,
    priority: doc.priority,
    scope: doc.scope,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

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

function isPopulatedSender(v: NotificationFields["sender_id"]): v is PopulatedSender {
  return typeof v === "object" && v !== null && "_id" in v;
}

function isPopulatedTerminal(v: NotificationFields["terminal_id"]): v is PopulatedTerminal {
  return typeof v === "object" && v !== null && "_id" in v;
}

function isPopulatedRoute(v: NotificationFields["route_id"]): v is PopulatedRoute {
  return typeof v === "object" && v !== null && "_id" in v;
}

function isPopulatedBus(v: NotificationFields["bus_id"]): v is PopulatedBus {
  return typeof v === "object" && v !== null && "_id" in v;
}

/** Populated-style label for ref:User — never returns raw id in UI */
export function senderRefLabel(senderId: NotificationFields["sender_id"]): string {
  if (isPopulatedSender(senderId)) {
    const name = [senderId.f_name, senderId.l_name].filter(Boolean).join(" ");
    return name || "—";
  }
  return MOCK_USER_NAMES[senderId] ?? "Unknown user";
}

/** Populated-style label for ref:Terminal */
export function terminalRefLabel(terminalId: NotificationFields["terminal_id"]): string {
  if (!terminalId) return "—";
  if (isPopulatedTerminal(terminalId)) {
    return terminalId.terminal_name ?? "Unknown terminal";
  }
  return MOCK_TERMINAL_NAMES[terminalId] ?? "Unknown terminal";
}

/** Populated-style label for ref:Route */
export function routeRefLabel(routeId: NotificationFields["route_id"]): string {
  if (!routeId) return "—";
  if (isPopulatedRoute(routeId)) {
    const parts = [routeId.route_name, routeId.route_code].filter(Boolean);
    return parts.length ? parts.join(" · ") : "Unknown route";
  }
  const name = TERMINAL_ROUTE_OPTIONS.find((r) => r.id === routeId)?.name;
  return name ?? "Unknown route";
}

/** Populated-style label for ref:Bus (fleet number) */
export function busRefLabel(busId: NotificationFields["bus_id"]): string {
  if (!busId) return "—";
  if (isPopulatedBus(busId)) {
    return busId.bus_number ?? busId.plate_number ?? "Unknown bus";
  }
  const row = TERMINAL_BUS_OPTIONS.find((b) => b.id === busId);
  return row?.bus_number ?? "Unknown bus";
}

export function notificationVisibleAtTerminal(n: NotificationFields): boolean {
  const termId =
    n.terminal_id === null
      ? null
      : typeof n.terminal_id === "object"
        ? String(n.terminal_id._id)
        : n.terminal_id;
  if (termId === DEFAULT_TERMINAL_ID) return true;

  const routeId =
    n.route_id === null ? null : typeof n.route_id === "object" ? String(n.route_id._id) : n.route_id;
  if (routeId && ROUTE_IDS.has(routeId)) return true;

  const busId =
    n.bus_id === null ? null : typeof n.bus_id === "object" ? String(n.bus_id._id) : n.bus_id;
  if (busId && BUS_IDS.has(busId)) return true;
  return false;
}

export function scopeSummary(n: NotificationFields): string {
  if (n.scope === "system") return "System-wide";
  if (n.scope === "terminal") return `Terminal · ${terminalRefLabel(n.terminal_id)}`;
  if (n.scope === "route") return `Route · ${routeRefLabel(n.route_id)}`;
  if (n.scope === "bus") return `Bus · ${busRefLabel(n.bus_id)}`;
  return n.scope;
}
