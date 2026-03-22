export const DEFAULT_TERMINAL_ID = "terminal-pitx";
export const DEFAULT_TERMINAL_NAME = "PITX";

export type TerminalNotification = {
  id: string;
  terminal_id: string;
  bus_id: string;
  bus_number: string;
  event_type:
    | "arrival_reported"
    | "arrival_confirmed"
    | "departure_reported"
    | "departure_confirmed";
  status: "pending_confirmation" | "confirmed" | "rejected";
  event_time: string;
  confirmation_time: string | null;
  auto_detected: boolean;
  remarks?: string | null;
};

type BusAssignmentLike = {
  id: string;
  bus_id: string;
  bus_number: string;
  route_name: string;
  scheduled_arrival_at: string;
  arrival_reported_at: string | null;
  arrival_confirmed_at: string | null;
  departure_reported_at: string | null;
  departure_confirmed_at: string | null;
};

/** Same mock generator as the dashboard so the feed stays consistent with other terminal views. */
export function buildTerminalNotificationsMockData() {
  const now = new Date();
  const isoOffset = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  const scheduled: BusAssignmentLike[] = [
    {
      id: "ba-1",
      bus_id: "bus-1",
      bus_number: "01-AB",
      route_name: "PITX — NEDSA",
      scheduled_arrival_at: isoOffset(-140),
      arrival_reported_at: isoOffset(-145),
      arrival_confirmed_at: isoOffset(-138),
      departure_reported_at: isoOffset(-110),
      departure_confirmed_at: isoOffset(-105),
    },
    {
      id: "ba-2",
      bus_id: "bus-2",
      bus_number: "12C",
      route_name: "PITX — SM North EDSA",
      scheduled_arrival_at: isoOffset(-75),
      arrival_reported_at: isoOffset(-76),
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-3",
      bus_id: "bus-3",
      bus_number: "13B",
      route_name: "PITX — SM North EDSA",
      scheduled_arrival_at: isoOffset(-45),
      arrival_reported_at: isoOffset(-46),
      arrival_confirmed_at: isoOffset(-41),
      departure_reported_at: isoOffset(-18),
      departure_confirmed_at: null,
    },
    {
      id: "ba-4",
      bus_id: "bus-4",
      bus_number: "02-D",
      route_name: "PITX — Fairview",
      scheduled_arrival_at: isoOffset(-22),
      arrival_reported_at: isoOffset(-23),
      arrival_confirmed_at: isoOffset(-18),
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-5",
      bus_id: "bus-5",
      bus_number: "07E",
      route_name: "PITX — NEDSA",
      scheduled_arrival_at: isoOffset(12),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-6",
      bus_id: "bus-6",
      bus_number: "09F",
      route_name: "PITX — Monumento",
      scheduled_arrival_at: isoOffset(28),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-7",
      bus_id: "bus-7",
      bus_number: "11A",
      route_name: "PITX — Fairview",
      scheduled_arrival_at: isoOffset(46),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-8",
      bus_id: "bus-8",
      bus_number: "15G",
      route_name: "PITX — SM North EDSA",
      scheduled_arrival_at: isoOffset(67),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
  ];

  const terminalId = DEFAULT_TERMINAL_ID;
  const notifications: TerminalNotification[] = [];

  const pushLog = (n: Omit<TerminalNotification, "id">) => {
    notifications.push({
      id: `${n.bus_id}-${n.event_type}-${n.event_time}`,
      ...n,
    });
  };

  for (const b of scheduled) {
    if (b.arrival_reported_at) {
      pushLog({
        terminal_id: terminalId,
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        event_type: "arrival_reported",
        status: b.arrival_confirmed_at ? "confirmed" : "pending_confirmation",
        event_time: b.arrival_reported_at,
        confirmation_time: b.arrival_confirmed_at,
        auto_detected: b.arrival_confirmed_at ? false : true,
        remarks:
          b.arrival_confirmed_at === null
            ? "Awaiting terminal admin confirmation"
            : null,
      });
    }

    if (b.arrival_confirmed_at) {
      pushLog({
        terminal_id: terminalId,
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        event_type: "arrival_confirmed",
        status: "confirmed",
        event_time: b.arrival_confirmed_at,
        confirmation_time: b.arrival_confirmed_at,
        auto_detected: false,
        remarks: "Arrival confirmed",
      });
    }

    if (b.departure_reported_at) {
      pushLog({
        terminal_id: terminalId,
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        event_type: "departure_reported",
        status: b.departure_confirmed_at ? "confirmed" : "pending_confirmation",
        event_time: b.departure_reported_at,
        confirmation_time: b.departure_confirmed_at,
        auto_detected: false,
        remarks: b.departure_confirmed_at ? null : "Awaiting terminal admin confirmation",
      });
    }

    if (b.departure_confirmed_at) {
      pushLog({
        terminal_id: terminalId,
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        event_type: "departure_confirmed",
        status: "confirmed",
        event_time: b.departure_confirmed_at,
        confirmation_time: b.departure_confirmed_at,
        auto_detected: false,
        remarks: "Departure confirmed",
      });
    }
  }

  const routeByBusId: Record<string, string> = {};
  for (const b of scheduled) {
    routeByBusId[b.bus_id] = b.route_name;
  }

  return {
    terminalId,
    terminalName: DEFAULT_TERMINAL_NAME,
    initialNotifications: notifications,
    routeByBusId,
  };
}
