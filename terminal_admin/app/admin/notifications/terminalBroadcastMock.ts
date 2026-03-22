import {
  MOCK_SYSTEM_SENDER_ID,
  MOCK_TERMINAL_SENDER_ID,
  type NotificationFields,
} from "./terminalBroadcastCatalog";
import { DEFAULT_TERMINAL_ID } from "./terminalNotificationsMock";

function isoOffset(minutesFromNow: number) {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

function atPair(minutesFromNow: number) {
  const t = isoOffset(minutesFromNow);
  return { createdAt: t, updatedAt: t };
}

/** Seed rows: only fields from `notification.model.js` (+ timestamps). */
export function buildInitialNotifications(): NotificationFields[] {
  const a = atPair(-180);
  const b = atPair(-95);
  const c = atPair(-40);
  const d = atPair(-210);

  return [
    {
      id: "bc-pitx-1",
      sender_id: MOCK_TERMINAL_SENDER_ID,
      terminal_id: DEFAULT_TERMINAL_ID,
      bus_id: null,
      route_id: null,
      title: "Gate B temporarily closed",
      message:
        "Passengers and buses should use Gate A for the next two hours while maintenance completes.",
      notification_type: "info",
      priority: "high",
      scope: "terminal",
      ...a,
    },
    {
      id: "bc-pitx-2",
      sender_id: MOCK_TERMINAL_SENDER_ID,
      terminal_id: DEFAULT_TERMINAL_ID,
      bus_id: null,
      route_id: "route-pitx-sne",
      title: "Delay — SM North EDSA corridor",
      message:
        "Heavy traffic on Roxas Blvd extension. Expect 10–15 minute delays for departures on this corridor.",
      notification_type: "delay",
      priority: "medium",
      scope: "route",
      ...b,
    },
    {
      id: "bc-pitx-3",
      sender_id: MOCK_TERMINAL_SENDER_ID,
      terminal_id: DEFAULT_TERMINAL_ID,
      bus_id: "bus-2",
      route_id: null,
      title: "Bus 12C — boarding hold",
      message: "Hold at bay 4 until dispatcher clearance due to platform congestion.",
      notification_type: "info",
      priority: "low",
      scope: "bus",
      ...c,
    },
    {
      id: "bc-system-1",
      sender_id: MOCK_SYSTEM_SENDER_ID,
      terminal_id: null,
      bus_id: null,
      route_id: "route-pitx-fv",
      title: "Regional advisory — weather",
      message: "Light rain expected this afternoon. Operators may adjust headways slightly.",
      notification_type: "info",
      priority: "low",
      scope: "route",
      ...d,
    },
  ];
}
