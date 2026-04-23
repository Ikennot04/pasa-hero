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

type PopulatedSender = { _id: string; f_name?: string; l_name?: string };
type PopulatedTerminal = { _id: string; terminal_name?: string };
type PopulatedRoute = {
  _id: string;
  route_name?: string;
  route_code?: string;
};
type PopulatedBus = { _id: string; bus_number?: string; plate_number?: string };

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

/** Populated-style label for ref:User. */
export function senderRefLabel(senderId: NotificationFields["sender_id"]): string {
  if (isPopulatedSender(senderId)) {
    const name = [senderId.f_name, senderId.l_name].filter(Boolean).join(" ");
    return name || "—";
  }
  return senderId;
}

/** Populated-style label for ref:Terminal */
export function terminalRefLabel(terminalId: NotificationFields["terminal_id"]): string {
  if (!terminalId) return "—";
  if (isPopulatedTerminal(terminalId)) {
    return terminalId.terminal_name ?? "Unknown terminal";
  }
  return terminalId;
}

/** Populated-style label for ref:Route */
export function routeRefLabel(routeId: NotificationFields["route_id"]): string {
  if (!routeId) return "—";
  if (isPopulatedRoute(routeId)) {
    const parts = [routeId.route_name, routeId.route_code].filter(Boolean);
    return parts.length ? parts.join(" · ") : "Unknown route";
  }
  return routeId;
}

/** Populated-style label for ref:Bus (fleet number) */
export function busRefLabel(busId: NotificationFields["bus_id"]): string {
  if (!busId) return "—";
  if (isPopulatedBus(busId)) {
    return busId.bus_number ?? busId.plate_number ?? "Unknown bus";
  }
  return busId;
}

export function scopeSummary(n: NotificationFields): string {
  if (n.scope === "system") return "System-wide";
  if (n.scope === "terminal") return `Terminal · ${terminalRefLabel(n.terminal_id)}`;
  if (n.scope === "route") return `Route · ${routeRefLabel(n.route_id)}`;
  if (n.scope === "bus") return `Bus · ${busRefLabel(n.bus_id)}`;
  return n.scope;
}
