import Notification from "../modules/notification/notification.model.js";
import User from "../modules/user/user.model.js";
import Bus from "../modules/bus/bus.model.js";
import Route from "../modules/route/route.model.js";
import Terminal from "../modules/terminal/terminal.model.js";

const SM_TERMINAL_NAME = "SM City Cebu Terminal";

/**
 * Appends high-priority notifications anchored to SM City Cebu Terminal
 * (terminal_id and/or routes that start or end at SM). Intended to run after
 * `seedTerminalNotificationTimeline()` during `npm run seed`.
 */
export default async function seedHighPrioritySmTerminalNotifications() {
  const smTerminal = await Terminal.findOne({ terminal_name: SM_TERMINAL_NAME });
  if (!smTerminal) {
    throw new Error(`Missing terminal "${SM_TERMINAL_NAME}".`);
  }

  const [operator1, operator2, terminalAdmin1] = await Promise.all([
    User.findOne({ email: "maria.santos@email.com" }),
    User.findOne({ email: "rico.alvarez@email.com" }),
    User.findOne({ email: "pedro.reyes@email.com" }),
  ]);

  if (!operator1 || !operator2 || !terminalAdmin1) {
    throw new Error("Missing users for high-priority SM notifications seed.");
  }

  const [bus1, bus3, bus11] = await Promise.all([
    Bus.findOne({ bus_number: "CEB-001" }),
    Bus.findOne({ bus_number: "CEB-003" }),
    Bus.findOne({ bus_number: "CEB-011" }),
  ]);

  const [route01A, route03C, route06F] = await Promise.all([
    Route.findOne({ route_code: "01A" }),
    Route.findOne({ route_code: "03C" }),
    Route.findOne({ route_code: "06F" }),
  ]);

  const required = [
    ["SM terminal", smTerminal],
    ["bus CEB-001", bus1],
    ["bus CEB-003", bus3],
    ["bus CEB-011", bus11],
    ["route 01A", route01A],
    ["route 03C", route03C],
    ["route 06F", route06F],
  ];

  for (const [label, doc] of required) {
    if (!doc) throw new Error(`Missing ${label} for high-priority SM seed.`);
  }

  const now = new Date();
  const t = (minsAgo) => new Date(now.getTime() - minsAgo * 60 * 1000);

  const payload = [
    {
      sender_id: String(terminalAdmin1._id),
      bus_id: String(bus3._id),
      route_id: String(route03C._id),
      terminal_id: String(smTerminal._id),
      title: "SM Terminal — urgent platform safety hold",
      message:
        "Hold departures on affected bays for equipment inspection; follow marshal instructions.",
      notification_type: "delay",
      priority: "high",
      scope: "terminal",
      createdAt: t(62),
    },
    {
      sender_id: String(operator1._id),
      bus_id: String(bus1._id),
      route_id: String(route01A._id),
      terminal_id: String(smTerminal._id),
      title: "CEB-001 — passenger assistance requested",
      message: "Marshal requested for priority boarding assistance at Bay 2.",
      notification_type: "info",
      priority: "high",
      scope: "terminal",
      createdAt: t(58),
    },
    {
      sender_id: String(terminalAdmin1._id),
      bus_id: null,
      route_id: null,
      terminal_id: String(smTerminal._id),
      title: "SM Cebu — gate security advisory",
      message:
        "Terminal staff: enforce revised ID checks at south gates until end of shift.",
      notification_type: "info",
      priority: "high",
      scope: "terminal",
      createdAt: t(54),
    },
    {
      sender_id: String(operator2._id),
      bus_id: String(bus11._id),
      route_id: String(route06F._id),
      terminal_id: String(smTerminal._id),
      title: "CEB-011 — weather-related delay",
      message:
        "Outbound 06F trip delayed approximately 15 minutes due to heavy rainfall.",
      notification_type: "delay",
      priority: "high",
      scope: "terminal",
      createdAt: t(50),
    },
  ];

  await Notification.insertMany(
    payload.map((n) => ({
      ...n,
      updatedAt: n.createdAt,
    })),
  );

  console.log(
    `✅ Created ${payload.length} high-priority notification(s) for ${SM_TERMINAL_NAME}`,
  );
}
