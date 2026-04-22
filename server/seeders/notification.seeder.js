import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import User from "../modules/user/user.model.js";
import Bus from "../modules/bus/bus.model.js";
import Route from "../modules/route/route.model.js";
import Terminal from "../modules/terminal/terminal.model.js";
import Notification from "../modules/notification/notification.model.js";
import UserNotification from "../modules/user_notification/user_notification.model.js";

// Anchor near end-of-day (local time) so all minutesAgo offsets stay within today.
const SEED_REFERENCE = new Date();
SEED_REFERENCE.setHours(23, 59, 0, 0);

function minutesAgo(minutes) {
  return new Date(SEED_REFERENCE.getTime() - minutes * 60 * 1000);
}

async function seedNotifications() {
  const [superAdmin, operator1, operator2, terminalAdmin1] = await Promise.all([
    User.findOne({ role: "super admin" }),
    User.findOne({ email: "maria.santos@email.com" }),
    User.findOne({ email: "rico.alvarez@email.com" }),
    User.findOne({ email: "pedro.reyes@email.com" }),
  ]);

  if (!superAdmin || !operator1 || !operator2 || !terminalAdmin1) {
    throw new Error("Missing users. Run `npm run seed` first so sender users exist.");
  }

  const [bus1, bus2, bus3, bus4, bus9, bus11] = await Promise.all([
    Bus.findOne({ bus_number: "CEB-001" }),
    Bus.findOne({ bus_number: "CEB-002" }),
    Bus.findOne({ bus_number: "CEB-003" }),
    Bus.findOne({ bus_number: "CEB-004" }),
    Bus.findOne({ bus_number: "CEB-009" }),
    Bus.findOne({ bus_number: "CEB-011" }),
  ]);

  const [route01A, route02B, route03C, route04D, route06F] = await Promise.all([
    Route.findOne({ route_code: "01A" }),
    Route.findOne({ route_code: "02B" }),
    Route.findOne({ route_code: "03C" }),
    Route.findOne({ route_code: "04D" }),
    Route.findOne({ route_code: "06F" }),
  ]);

  const smTerminal = await Terminal.findOne({
    terminal_name: "SM City Cebu Terminal",
  });

  const requiredEntities = [
    ["bus CEB-001", bus1],
    ["bus CEB-002", bus2],
    ["bus CEB-003", bus3],
    ["bus CEB-004", bus4],
    ["bus CEB-009", bus9],
    ["bus CEB-011", bus11],
    ["route 01A", route01A],
    ["route 02B", route02B],
    ["route 03C", route03C],
    ["route 04D", route04D],
    ["route 06F", route06F],
    ["SM terminal", smTerminal],
  ];

  for (const [label, doc] of requiredEntities) {
    if (!doc) throw new Error(`Missing ${label}. Run \`npm run seed\` first.`);
  }

  await Notification.deleteMany({});
  await UserNotification.deleteMany({});

  await User.updateMany(
    {
      email: {
        $in: [
          "pedro.reyes@email.com",
          "maria.santos@email.com",
          "rico.alvarez@email.com",
        ],
      },
    },
    { $set: { assigned_terminal: smTerminal._id } },
  );

  const makeTerminalEvent = ({
    sender,
    bus,
    route,
    title,
    message,
    type,
    minutes,
    priority = "medium",
  }) => ({
    sender_id: String(sender._id),
    bus_id: String(bus._id),
    route_id: String(route._id),
    terminal_id: String(smTerminal._id),
    title,
    message,
    notification_type: type,
    priority,
    scope: "terminal",
    createdAt: minutesAgo(minutes),
  });

  const notificationPayload = [
    {
      sender_id: String(superAdmin._id),
      terminal_id: String(smTerminal._id),
      title: "SM City Cebu Terminal Operations Open",
      message: "Daily dispatch monitoring is active for all SM-bound routes.",
      notification_type: "info",
      priority: "medium",
      scope: "terminal",
      createdAt: minutesAgo(470),
    },
    makeTerminalEvent({
      sender: operator1,
      bus: bus3,
      route: route03C,
      title: "CEB-003 Arrival Reported at SM City Cebu",
      message: "Operator reported CEB-003 entering Bay 6 approach lane.",
      type: "arrival_reported",
      minutes: 460,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus3,
      route: route03C,
      title: "CEB-003 Arrival Confirmed at SM City Cebu",
      message: "Terminal admin confirmed CEB-003 docked at Bay 6.",
      type: "arrival_confirmed",
      minutes: 456,
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus3,
      route: route03C,
      title: "CEB-003 Departure Reported from SM City Cebu",
      message: "Operator reported CEB-003 departed for the next loop.",
      type: "departure_reported",
      minutes: 448,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus3,
      route: route03C,
      title: "CEB-003 Departure Confirmed from SM City Cebu",
      message: "Departure and gate release for CEB-003 were confirmed.",
      type: "departure_confirmed",
      minutes: 444,
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus11,
      route: route06F,
      title: "CEB-011 Arrival Reported at SM City Cebu",
      message: "Operator reported CEB-011 at terminal entry queue.",
      type: "arrival_reported",
      minutes: 430,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus11,
      route: route06F,
      title: "CEB-011 Arrival Confirmed at SM City Cebu",
      message: "CEB-011 was confirmed docked at Bay 5.",
      type: "arrival_confirmed",
      minutes: 426,
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus11,
      route: route06F,
      title: "CEB-011 Departure Reported from SM City Cebu",
      message: "Operator reported CEB-011 beginning outbound movement.",
      type: "departure_reported",
      minutes: 418,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus11,
      route: route06F,
      title: "CEB-011 Departure Confirmed from SM City Cebu",
      message: "Terminal operations confirmed CEB-011 departure.",
      type: "departure_confirmed",
      minutes: 414,
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus1,
      route: route01A,
      title: "CEB-001 Arrival Reported at SM City Cebu",
      message: "Operator reported CEB-001 approaching Bay 2.",
      type: "arrival_reported",
      minutes: 395,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus1,
      route: route01A,
      title: "CEB-001 Arrival Confirmed at SM City Cebu",
      message: "Bay marshal confirmed CEB-001 docking at Bay 2.",
      type: "arrival_confirmed",
      minutes: 391,
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus1,
      route: route01A,
      title: "CEB-001 Departure Reported from SM City Cebu",
      message: "Operator reported CEB-001 leaving the loading bay.",
      type: "departure_reported",
      minutes: 383,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus1,
      route: route01A,
      title: "CEB-001 Departure Confirmed from SM City Cebu",
      message: "CEB-001 departure was validated by terminal operations.",
      type: "departure_confirmed",
      minutes: 379,
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus2,
      route: route03C,
      title: "CEB-002 Arrival Reported at SM City Cebu",
      message: "Operator reported CEB-002 entering Bay 4 lane.",
      type: "arrival_reported",
      minutes: 360,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus2,
      route: route03C,
      title: "CEB-002 Arrival Confirmed at SM City Cebu",
      message: "Terminal team confirmed CEB-002 docked at Bay 4.",
      type: "arrival_confirmed",
      minutes: 356,
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus2,
      route: route03C,
      title: "CEB-002 Departure Reported from SM City Cebu",
      message: "Operator reported CEB-002 departed to IT Park loop.",
      type: "departure_reported",
      minutes: 348,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus2,
      route: route03C,
      title: "CEB-002 Departure Confirmed from SM City Cebu",
      message: "SM terminal confirmed gate release for CEB-002.",
      type: "departure_confirmed",
      minutes: 344,
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus4,
      route: route04D,
      title: "CEB-004 Arrival Reported at SM City Cebu",
      message: "Operator reported CEB-004 entering passenger drop-off lane.",
      type: "arrival_reported",
      minutes: 322,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus4,
      route: route04D,
      title: "CEB-004 Arrival Confirmed at SM City Cebu",
      message: "CEB-004 docking was confirmed by Bay 1 staff.",
      type: "arrival_confirmed",
      minutes: 318,
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus4,
      route: route04D,
      title: "CEB-004 Departure Reported from SM City Cebu",
      message: "Operator reported CEB-004 pulled out from Bay 1.",
      type: "departure_reported",
      minutes: 309,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus4,
      route: route04D,
      title: "CEB-004 Departure Confirmed from SM City Cebu",
      message: "Terminal control confirmed CEB-004 outbound departure.",
      type: "departure_confirmed",
      minutes: 305,
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus9,
      route: route02B,
      title: "CEB-009 Arrival Reported at SM City Cebu",
      message: "Operator reported CEB-009 arriving at Bay 3 queue.",
      type: "arrival_reported",
      minutes: 284,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus9,
      route: route02B,
      title: "CEB-009 Arrival Confirmed at SM City Cebu",
      message: "Terminal staff confirmed CEB-009 docking at Bay 3.",
      type: "arrival_confirmed",
      minutes: 280,
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus9,
      route: route02B,
      title: "CEB-009 Departure Reported from SM City Cebu",
      message: "Operator reported CEB-009 left SM terminal for Route 02B.",
      type: "departure_reported",
      minutes: 272,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus9,
      route: route02B,
      title: "CEB-009 Departure Confirmed from SM City Cebu",
      message: "Departure validation complete for CEB-009.",
      type: "departure_confirmed",
      minutes: 268,
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus11,
      route: route06F,
      title: "CEB-011 Arrival Reported at SM City Cebu (Second Trip)",
      message: "Operator reported second turnaround arrival for CEB-011.",
      type: "arrival_reported",
      minutes: 170,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus11,
      route: route06F,
      title: "CEB-011 Arrival Confirmed at SM City Cebu (Second Trip)",
      message: "CEB-011 second arrival confirmed at Bay 5.",
      type: "arrival_confirmed",
      minutes: 166,
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus11,
      route: route06F,
      title: "CEB-011 Departure Reported from SM City Cebu (Second Trip)",
      message: "Operator reported CEB-011 departed after unloading.",
      type: "departure_reported",
      minutes: 158,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus11,
      route: route06F,
      title: "CEB-011 Departure Confirmed from SM City Cebu (Second Trip)",
      message: "Terminal operations confirmed second departure for CEB-011.",
      type: "departure_confirmed",
      minutes: 154,
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus3,
      route: route03C,
      title: "CEB-003 Arrival Reported at SM City Cebu (Evening)",
      message: "Operator reported evening arrival for CEB-003.",
      type: "arrival_reported",
      minutes: 95,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus3,
      route: route03C,
      title: "CEB-003 Arrival Confirmed at SM City Cebu (Evening)",
      message: "Terminal confirmed CEB-003 evening docking at Bay 6.",
      type: "arrival_confirmed",
      minutes: 91,
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus1,
      route: route01A,
      title: "CEB-001 Departure Reported from SM City Cebu (Late)",
      message: "Operator reported CEB-001 late-evening pullout.",
      type: "departure_reported",
      minutes: 55,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus1,
      route: route01A,
      title: "CEB-001 Departure Confirmed from SM City Cebu (Late)",
      message: "Terminal admin confirmed final late departure for CEB-001.",
      type: "departure_confirmed",
      minutes: 51,
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus3,
      route: route03C,
      title: "SM Terminal — platform safety hold",
      message:
        "Hold departures on affected bays for equipment inspection; follow marshal instructions.",
      type: "delay",
      minutes: 72,
      priority: "high",
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus1,
      route: route01A,
      title: "CEB-001 urgent passenger assistance",
      message: "Marshal requested for priority boarding assistance at Bay 2.",
      type: "info",
      minutes: 68,
      priority: "high",
    }),
    {
      sender_id: String(terminalAdmin1._id),
      terminal_id: String(smTerminal._id),
      title: "Gate policy — high-priority advisory",
      message:
        "Terminal staff: enforce revised ID checks at south gates until end of shift.",
      notification_type: "info",
      priority: "high",
      scope: "terminal",
      createdAt: minutesAgo(64),
    },
    {
      sender_id: String(superAdmin._id),
      terminal_id: String(smTerminal._id),
      title: "SM City Cebu Terminal Peak Monitoring",
      message: "Terminal command confirms all monitored dispatch updates are synced.",
      notification_type: "info",
      priority: "low",
      scope: "terminal",
      createdAt: minutesAgo(20),
    },
  ];

  const notifications = await Notification.insertMany(
    notificationPayload.map((notification) => ({
      ...notification,
      updatedAt: notification.createdAt,
    })),
  );

  console.log(`✅ Created ${notifications.length} notifications`);
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (isDirectRun) {
  if (!process.env.MONGO_DB_URI) {
    console.error(
      "❌ Missing MONGO_DB_URI. Ensure server/.env exists and is loaded.",
    );
    process.exit(1);
  }

  mongoose
    .connect(process.env.MONGO_DB_URI)
    .then(() => {
      console.log("📦 Connected to MongoDB");
      return seedNotifications();
    })
    .then(() => {
      console.log("🎉 Notification seed complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Notification seed failed:", error);
      process.exit(1);
    });
}

export default seedNotifications;
