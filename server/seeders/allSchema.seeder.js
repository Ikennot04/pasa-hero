// seed-data.js
import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import User from "../modules/user/user.model.js";
import Bus from "../modules/bus/bus.model.js";
import BusStatus from "../modules/bus_status/bus_status.model.js";
import BusLocation from "../modules/bus_location/bus_location.model.js";
import Route from "../modules/route/route.model.js";
import Terminal from "../modules/terminal/terminal.model.js";
import Driver from "../modules/driver/driver.model.js";
import RouteStop from "../modules/route_stop/route_stop.model.js";
import BusAssignment from "../modules/bus_assignment/bus_assignment.model.js";
import Notification from "../modules/notification/notification.model.js";
import UserNotification from "../modules/user_notification/user_notification.model.js";
import UserSubscription from "../modules/user_subscription/user_subscription.model.js";
import SystemLog from "../modules/system_log/system_log.model.js";
import TerminalLog from "../modules/terminal_log/terminal_log.model.js";
import seedHighPrioritySmTerminalNotifications from "./highPrioritySmTerminalNotifications.seeder.js";
import seedUserNotifications from "./userNotifications.seeder.js";
import { buildSystemLogDocuments } from "./systemLogs.seeder.js";
import seedDevAdminUsers, {
  DEV_TERMINAL_ADMIN,
} from "./devAdminUsers.seeder.js";
import seedJohnAdminUsers from "./johnAdminUsers.seeder.js";
import seedAssignedOperators from "./assignedOperators.seeder.js";
import {
  getOccupancyStatus,
  insertBusStatusesForSeedBuses,
} from "./busStatuses.seeder.js";

const ALLOWED_USER_STATUSES = new Set(["active", "suspended"]);

function normalizeUserSeedStatus(status) {
  if (status === "inactive") return "suspended";
  if (!status) return "active";
  if (!ALLOWED_USER_STATUSES.has(status)) {
    throw new Error(
      `Invalid user seed status "${status}". Allowed values: active, suspended.`,
    );
  }
  return status;
}

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_DB_URI) {
    throw new Error(
      "Missing MONGO_DB_URI. Ensure server/.env exists and is loaded.",
    );
  }
  await mongoose.connect(process.env.MONGO_DB_URI);
  console.log("📦 Connected to MongoDB");
}

// Anchor near end-of-day (local time) so minutesAgo offsets stay within the same calendar day.
const NOTIFICATION_SEED_REFERENCE = new Date();
NOTIFICATION_SEED_REFERENCE.setHours(23, 59, 0, 0);

function minutesAgo(minutes) {
  return new Date(
    NOTIFICATION_SEED_REFERENCE.getTime() - minutes * 60 * 1000,
  );
}

/**
 * Drop assignments for out-of-service buses; maintenance buses get cancelled (inactive).
 */
function normalizeSeedBusAssignment(doc, busById) {
  const id = String(doc.bus_id);
  const bus = busById.get(id);
  if (!bus) return doc;
  if (bus.status === "out of service") return null;
  if (bus.status === "maintenance") {
    return {
      ...doc,
      assignment_status: "inactive",
      assignment_result: "cancelled",
    };
  }
  return doc;
}

/**
 * Set each BusAssignment.latest_terminal_log_id to the TerminalLog with the latest
 * event_time for that assignment (tie-break _id). Call after seeding TerminalLog rows.
 */
export async function syncLatestTerminalLogIdsFromSeedLogs() {
  const rows = await TerminalLog.aggregate([
    { $sort: { event_time: 1, _id: 1 } },
    { $group: { _id: "$bus_assignment_id", latestLogId: { $last: "$_id" } } },
  ]);
  if (!rows.length) return;
  await Promise.all(
    rows.map((row) =>
      BusAssignment.updateOne(
        { _id: row._id },
        { $set: { latest_terminal_log_id: row.latestLogId } },
      ),
    ),
  );
}

/**
 * Buses with a completed trip and no active+pending assignment get empty occupancy.
 * CEB-017 (multi-assignment demo: completed + cancelled + pending) gets partial occupancy.
 */
export async function syncBusOccupancyForCompletedTrips() {
  const assignments = await BusAssignment.find({})
    .select("bus_id assignment_status assignment_result")
    .lean();
  const activePendingByBus = new Set();
  for (const a of assignments) {
    if (a.assignment_status === "active" && a.assignment_result === "pending") {
      activePendingByBus.add(String(a.bus_id));
    }
  }
  for (const a of assignments) {
    if (a.assignment_result !== "completed") continue;
    const busId = String(a.bus_id);
    if (activePendingByBus.has(busId)) continue;
    await BusStatus.updateOne(
      { bus_id: busId, is_deleted: false },
      { $set: { occupancy_count: 0, occupancy_status: "empty" } },
    );
  }

  const multiBus = await Bus.findOne({ bus_number: "CEB-017" });
  if (multiBus) {
    const forBus = await BusAssignment.find({ bus_id: multiBus._id }).lean();
    const hasCompleted = forBus.some((x) => x.assignment_result === "completed");
    const hasCancelled = forBus.some((x) => x.assignment_result === "cancelled");
    const hasActivePending = forBus.some(
      (x) => x.assignment_status === "active" && x.assignment_result === "pending",
    );
    if (hasCompleted && hasCancelled && hasActivePending) {
      const cap = multiBus.capacity || 50;
      const occ = Math.min(18, Math.max(0, cap - 1));
      await BusStatus.updateOne(
        { bus_id: String(multiBus._id), is_deleted: false },
        { $set: { occupancy_count: occ, occupancy_status: getOccupancyStatus(occ, cap) } },
      );
    }
  }

  const emptyOccupancyBuses = await Bus.find({
    status: { $in: ["out of service", "maintenance"] },
  })
    .select("_id")
    .lean();
  for (const b of emptyOccupancyBuses) {
    await BusStatus.updateOne(
      { bus_id: String(b._id), is_deleted: false },
      { $set: { occupancy_count: 0, occupancy_status: "empty" } },
    );
  }
}

/** Current UTC calendar day at the given time (operational-summary demo; pass ?date=YYYY-MM-DD for that UTC day). */
function utcTodayAt(hour, minute = 0) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0),
  );
}

/** Extra SM assignments use these buses (not the main-seed CEB-003 / CEB-011 pair we keep for logs). */
const DEMO_EXTRA_BUS_NUMBERS = [
  "CEB-001",
  "CEB-002",
  "CEB-004",
  "CEB-005",
  "CEB-006",
  "CEB-007",
  "CEB-008",
  "CEB-009",
  "CEB-012",
];

const DRIVER_LICENSES = [
  "D01-12-345678",
  "D01-12-345679",
  "D01-12-345680",
  "D01-12-345681",
  "D01-12-345682",
  "D01-12-345683",
  "D01-12-345684",
  "D01-12-345685",
  "D01-12-345686",
];

/** Extra drivers for SM operational-summary demo assignments (unique active+pending vs main seed). */
const SM_DEMO_DRIVER_LICENSES = [
  "D01-SEED-SM-DEMO-01",
  "D01-SEED-SM-DEMO-02",
  "D01-SEED-SM-DEMO-03",
  "D01-SEED-SM-DEMO-04",
  "D01-SEED-SM-DEMO-05",
  "D01-SEED-SM-DEMO-06",
  "D01-SEED-SM-DEMO-07",
  "D01-SEED-SM-DEMO-08",
  "D01-SEED-SM-DEMO-09",
  "D01-SEED-SM-DEMO-10",
];

export async function seedOperationalSummaryDemo() {
  const smTerminal = await Terminal.findOne({
    terminal_name: "SM City Cebu Terminal",
  });
  if (!smTerminal) {
    throw new Error(
      'Terminal "SM City Cebu Terminal" not found. Run `npm run seed` first.',
    );
  }

  const route03C = await Route.findOne({ route_code: "03C" });
  const route06F = await Route.findOne({ route_code: "06F" });
  if (!route03C || !route06F) {
    throw new Error("Routes 03C / 06F not found. Run `npm run seed` first.");
  }

  const smRouteIds = [route03C._id, route06F._id];

  const operatorReporter = await User.findOne({ email: "maria.santos@email.com" });
  if (!operatorReporter) {
    throw new Error("Operator maria.santos@email.com not found. Run `npm run seed` first.");
  }

  const admin = await User.findOne({ role: "super admin" });

  const drivers = [];
  for (const lic of DRIVER_LICENSES) {
    const d = await Driver.findOne({ license_number: lic });
    if (!d) throw new Error(`Driver ${lic} not found. Run \`npm run seed\` first.`);
    drivers.push(d);
  }

  const demoBuses = [];
  for (const num of DEMO_EXTRA_BUS_NUMBERS) {
    const b = await Bus.findOne({ bus_number: num });
    if (!b) throw new Error(`Bus ${num} not found. Run \`npm run seed\` first.`);
    demoBuses.push(b);
  }

  const b3 = await Bus.findOne({ bus_number: "CEB-003" });
  const b11 = await Bus.findOne({ bus_number: "CEB-011" });
  if (!b3 || !b11) {
    throw new Error("CEB-003 / CEB-011 not found. Run `npm run seed` first.");
  }

  await BusAssignment.deleteMany({
    bus_id: { $in: demoBuses.map((b) => b._id) },
    route_id: { $in: smRouteIds },
  });

  await TerminalLog.deleteMany({});
  await BusAssignment.updateMany({}, { $set: { latest_terminal_log_id: null } });

  const smAssignments = await BusAssignment.find({
    route_id: { $in: smRouteIds },
  });

  const staggerHours = [6, 7, 8, 9, 10, 11, 12];
  for (let i = 0; i < smAssignments.length; i += 1) {
    const h = staggerHours[i % staggerHours.length] + Math.floor(i / staggerHours.length);
    await BusAssignment.updateOne(
      { _id: smAssignments[i]._id },
      {
        $set: {
          scheduled_arrival_at: utcTodayAt(h, (i % 4) * 15),
        },
      },
    );
  }

  // Extra assignments: [busIndex, route06F? , hour, minute]
  const extraSpecs = [
    [0, true, 6, 20],
    [1, false, 6, 50],
    [2, true, 7, 25],
    [3, false, 8, 10],
    [4, true, 12, 40],
    [5, false, 13, 5],
    [6, true, 14, 20],
    [7, false, 15, 55],
    [8, true, 17, 30],
  ];

  /** Matches getAvailableAssignmentResourcesByTerminalId: any pending trip blocks the driver/operator. */
  const pendingCrewUsing = await BusAssignment.find({
    assignment_result: "pending",
  })
    .select("driver_id operator_user_id")
    .lean();
  const usedDriverIds = new Set(
    pendingCrewUsing.map((x) => String(x.driver_id)),
  );
  const usedOperatorIds = new Set(
    pendingCrewUsing.map((x) => String(x.operator_user_id)),
  );

  const smDemoDriverDocs = await Driver.find({
    license_number: { $in: SM_DEMO_DRIVER_LICENSES },
  }).lean();
  const smDemoByLic = new Map(
    smDemoDriverDocs.map((d) => [d.license_number, d]),
  );
  for (const lic of SM_DEMO_DRIVER_LICENSES) {
    if (!smDemoByLic.has(lic)) {
      throw new Error(`SM demo driver ${lic} not found. Run full \`npm run seed\` first.`);
    }
  }

  const smFreeOperators = await User.find({
    role: "operator",
    status: "active",
    email: { $regex: /^seed\.op\.smfree\./ },
  })
    .sort({ email: 1 })
    .lean();

  let smDemoDriverIdx = 0;
  let smFreeOpIdx = 0;

  const takeSmDemoDriver = () => {
    while (smDemoDriverIdx < SM_DEMO_DRIVER_LICENSES.length) {
      const lic = SM_DEMO_DRIVER_LICENSES[smDemoDriverIdx++];
      const d = smDemoByLic.get(lic);
      const id = String(d._id);
      if (usedDriverIds.has(id)) continue;
      usedDriverIds.add(id);
      return d._id;
    }
    throw new Error(
      "Not enough free SM demo drivers for extras — add more D01-SEED-SM-DEMO-* drivers in allSchema seeder.",
    );
  };

  const takeSmFreeOperator = () => {
    while (smFreeOpIdx < smFreeOperators.length) {
      const u = smFreeOperators[smFreeOpIdx++];
      const id = String(u._id);
      if (usedOperatorIds.has(id)) continue;
      usedOperatorIds.add(id);
      return u._id;
    }
    throw new Error(
      "Not enough free seed.op.smfree.* operators for SM demo extras — add more in allSchema seeder.",
    );
  };

  const inactiveSeedDriver = await Driver.findOne({
    license_number: "D01-12-345684",
  });

  const extraPayload = extraSpecs
    .map(([busIdx, use06F, h, m]) => {
      const bus = demoBuses[busIdx];
      if (bus.status === "out of service") return null;
      if (bus.status === "maintenance") {
        return {
          bus_id: bus._id,
          driver_id: inactiveSeedDriver?._id ?? drivers[busIdx]._id,
          operator_user_id: operatorReporter._id,
          route_id: use06F ? route06F._id : route03C._id,
          assignment_status: "inactive",
          assignment_result: "cancelled",
          scheduled_arrival_at: utcTodayAt(h, m),
        };
      }
      return {
        bus_id: bus._id,
        driver_id: takeSmDemoDriver(),
        operator_user_id: takeSmFreeOperator(),
        route_id: use06F ? route06F._id : route03C._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: utcTodayAt(h, m),
      };
    })
    .filter(Boolean);

  await BusAssignment.insertMany(extraPayload);

  await syncBusOccupancyForCompletedTrips();

  const findAssign = (bus, route) =>
    BusAssignment.findOne({ bus_id: bus._id, route_id: route._id });

  const aBus3 = await findAssign(b3, route03C);
  const aBus11 = await findAssign(b11, route06F);
  const a1 = await findAssign(demoBuses[0], route06F);
  const a2 = await findAssign(demoBuses[1], route03C);
  const a4 = await findAssign(demoBuses[2], route06F);
  const a5 = await findAssign(demoBuses[3], route03C);
  const a6 = await findAssign(demoBuses[4], route06F);
  const a7 = await findAssign(demoBuses[5], route03C);
  const a8 = await findAssign(demoBuses[6], route06F);
  const a9 = await findAssign(demoBuses[7], route03C);
  const a12 = await findAssign(demoBuses[8], route06F);

  const required = [
    ["CEB-003/03C", aBus3],
    ["CEB-011/06F", aBus11],
    ["CEB-001/06F", a1],
    ["CEB-002/03C", a2],
    ["CEB-004/06F", a4],
    ["CEB-005/03C", a5],
    ["CEB-006/06F", a6],
    ["CEB-007/03C", a7],
    ["CEB-008/06F", a8],
    ["CEB-009/03C", a9],
    ["CEB-012/06F", a12],
  ];
  for (const [label, doc] of required) {
    if (!doc) throw new Error(`Missing assignment: ${label}`);
  }

  const logs = await TerminalLog.insertMany([
    // --- Departed today (3 buses) ---
    {
      bus_assignment_id: aBus3._id,
      terminal_id: smTerminal._id,
      bus_id: b3._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utcTodayAt(8, 0),
      confirmation_time: utcTodayAt(8, 5),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: aBus3._id,
      terminal_id: smTerminal._id,
      bus_id: b3._id,
      event_type: "departure",
      status: "confirmed",
      event_time: utcTodayAt(12, 0),
      confirmation_time: utcTodayAt(12, 10),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: a1._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[0]._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utcTodayAt(6, 15),
      confirmation_time: utcTodayAt(6, 18),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: a1._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[0]._id,
      event_type: "departure",
      status: "confirmed",
      event_time: utcTodayAt(7, 25),
      confirmation_time: utcTodayAt(7, 28),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: a12._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[8]._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utcTodayAt(16, 0),
      confirmation_time: utcTodayAt(16, 5),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: a12._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[8]._id,
      event_type: "departure",
      status: "confirmed",
      event_time: utcTodayAt(16, 45),
      confirmation_time: utcTodayAt(16, 48),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    // --- Present at terminal (3 buses) ---
    {
      bus_assignment_id: aBus11._id,
      terminal_id: smTerminal._id,
      bus_id: b11._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utcTodayAt(10, 0),
      confirmation_time: utcTodayAt(10, 3),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: a2._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[1]._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utcTodayAt(13, 10),
      confirmation_time: utcTodayAt(13, 14),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: a9._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[7]._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utcTodayAt(14, 50),
      confirmation_time: utcTodayAt(14, 55),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    // --- Pending arrival (2 buses) ---
    {
      bus_assignment_id: a5._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[3]._id,
      event_type: "arrival",
      status: "pending",
      event_time: utcTodayAt(9, 20),
      confirmation_time: null,
      reported_by: operatorReporter._id,
      auto_detected: false,
    },
    {
      bus_assignment_id: a4._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[2]._id,
      event_type: "arrival",
      status: "pending",
      event_time: utcTodayAt(8, 40),
      confirmation_time: null,
      reported_by: operatorReporter._id,
      auto_detected: false,
    },
    // --- Pending departure (2 buses) ---
    {
      bus_assignment_id: a7._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[5]._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utcTodayAt(11, 0),
      confirmation_time: utcTodayAt(11, 4),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: a7._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[5]._id,
      event_type: "departure",
      status: "pending",
      event_time: utcTodayAt(11, 45),
      confirmation_time: null,
      reported_by: operatorReporter._id,
      auto_detected: false,
    },
    {
      bus_assignment_id: a6._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[4]._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utcTodayAt(12, 5),
      confirmation_time: utcTodayAt(12, 8),
      reported_by: admin?._id ?? null,
      confirmed_by: admin?._id ?? null,
      auto_detected: false,
    },
    {
      bus_assignment_id: a6._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[4]._id,
      event_type: "departure",
      status: "pending",
      event_time: utcTodayAt(12, 55),
      confirmation_time: null,
      reported_by: operatorReporter._id,
      auto_detected: false,
    },
    // CEB-008 / a8: scheduled only — no logs
  ]);

  await syncLatestTerminalLogIdsFromSeedLogs();
  await syncBusOccupancyForCompletedTrips();

  const totalSmAssignments = smAssignments.length + extraSpecs.length;

  const demoUtc = new Date();
  const demoDateIso = demoUtc.toISOString().slice(0, 10);
  const demoDateUs = `${String(demoUtc.getUTCMonth() + 1).padStart(2, "0")}/${String(demoUtc.getUTCDate()).padStart(2, "0")}/${demoUtc.getUTCFullYear()}`;

  console.log("\n✅ Terminal operational summary demo (" + demoDateIso + " UTC)");
  console.log("   Terminal:", smTerminal.terminal_name, `(${smTerminal._id})`);
  console.log("   Date:", demoDateUs, "(UTC)");
  console.log("   TerminalLog events:", logs.length);
  console.log("   SM assignments (scheduled that day):", totalSmAssignments);
  console.log(
    "\n   GET /api/terminals/" + String(smTerminal._id) + "/operational-summary?date=" + demoDateIso,
  );
  console.log("   Expected ≈ scheduled: 11, present: 3, departed_today: 3, pending: 4 (2+2)\n");
}



export async function seedTerminalNotificationTimeline() {
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
      sender: operator1,
      bus: bus3,
      route: route03C,
      title: "Route 03C Traffic Delay Advisory",
      message:
        "Route 03C is experiencing corridor congestion near JY Square with an estimated 7-minute delay.",
      type: "delay",
      minutes: 66,
      priority: "medium",
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus11,
      route: route06F,
      title: "Route 06F Near Capacity Alert",
      message:
        "High passenger demand detected on Route 06F. Current trip is at full standing capacity.",
      type: "full",
      minutes: 63,
      priority: "high",
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus9,
      route: route02B,
      title: "Route 02B Dispatch Delay",
      message:
        "Dispatch on Route 02B is delayed by about 5 minutes due to temporary loading congestion.",
      type: "delay",
      minutes: 60,
      priority: "medium",
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus4,
      route: route04D,
      title: "Route 04D Full Load Advisory",
      message:
        "Inbound Route 04D bus reached full seated and standing capacity before final boarding.",
      type: "full",
      minutes: 57,
      priority: "medium",
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus1,
      route: route01A,
      title: "Route 01A Delay Near Fuente",
      message:
        "Route 01A is moving slowly near Fuente Osmena due to lane restrictions with an estimated 4-minute delay.",
      type: "delay",
      minutes: 49,
      priority: "medium",
    }),
    makeTerminalEvent({
      sender: operator1,
      bus: bus2,
      route: route03C,
      title: "Route 03C Full Capacity Notice",
      message:
        "Current Route 03C trip reached full capacity before final pickup at SM City Cebu.",
      type: "full",
      minutes: 47,
      priority: "high",
    }),
    makeTerminalEvent({
      sender: operator2,
      bus: bus9,
      route: route02B,
      title: "Route 02B Minor Delay Update",
      message:
        "Route 02B outbound service is delayed around 3 minutes because of curbside congestion.",
      type: "delay",
      minutes: 45,
      priority: "low",
    }),
    makeTerminalEvent({
      sender: terminalAdmin1,
      bus: bus11,
      route: route06F,
      title: "Route 06F Full Standing Load",
      message:
        "Another Route 06F trip reported full standing load at the terminal queue.",
      type: "full",
      minutes: 43,
      priority: "medium",
    }),
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

const seedData = async () => {
  try {
    await ensureDbConnected();

    // Clear existing data
    await User.deleteMany({});
    await Terminal.deleteMany({});
    await Route.deleteMany({});
    await RouteStop.deleteMany({});
    await Bus.deleteMany({});
    await BusStatus.deleteMany({});
    await BusLocation.deleteMany({});
    await Driver.deleteMany({});
    await BusAssignment.deleteMany({});
    await Notification.deleteMany({});
    await UserNotification.deleteMany({});
    await UserSubscription.deleteMany({});
    await SystemLog.deleteMany({});

    console.log("🗑️  Cleared existing data");

    // ==========================================
    // 1. CREATE USERS
    // ==========================================
    const userSeedRows = [
      {
        f_name: "Juan",
        l_name: "Dela Cruz",
        email: "juan.delacruz@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz", // hashed password
        role: "super admin",
        status: "active",
        firebase_id: "firebase_admin_001",
        profile_image: "default.png",
      },
      {
        f_name: "Maria",
        l_name: "Santos",
        email: "maria.santos@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_operator_001",
        profile_image: "default.png",
      },
      {
        f_name: "Pedro",
        l_name: "Reyes",
        email: "pedro.reyes@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "terminal admin",
        status: "active",
        firebase_id: "firebase_terminal_001",
        profile_image: "default.png",
      },
      {
        f_name: "Ana",
        l_name: "Garcia",
        email: "ana.garcia@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_001",
        profile_image: "default.png",
      },
      {
        f_name: "Carlos",
        l_name: "Mendoza",
        email: "carlos.mendoza@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_002",
        profile_image: "default.png",
      },
      {
        f_name: "Lisa",
        l_name: "Tan",
        email: "lisa.tan@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_003",
        profile_image: "default.png",
      },
      {
        f_name: "Mark",
        l_name: "Reyes",
        email: "mark.reyes@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_004",
        profile_image: "default.png",
      },
      {
        f_name: "Sofia",
        l_name: "Cruz",
        email: "sofia.cruz@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_005",
        profile_image: "default.png",
      },
      {
        f_name: "Rico",
        l_name: "Alvarez",
        email: "rico.alvarez@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_operator_002",
        profile_image: "default.png",
      },
      {
        f_name: "Jenny",
        l_name: "Lim",
        email: "jenny.lim@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "terminal admin",
        status: "active",
        firebase_id: "firebase_terminal_002",
        profile_image: "default.png",
      },
      {
        f_name: "Nina",
        l_name: "Ocampo",
        email: "nina.ocampo@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_006",
        profile_image: "default.png",
      },
      {
        f_name: "Derek",
        l_name: "Chua",
        email: "derek.chua@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_007",
        profile_image: "default.png",
      },
      {
        f_name: "Elena",
        l_name: "Villanueva",
        email: "elena.villanueva@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "suspended",
        firebase_id: "firebase_user_008",
        profile_image: "default.png",
      },
      {
        f_name: "Rhian",
        l_name: "Ramos",
        email: "seed.op.assign.03@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_op_assign_03",
        profile_image: "default.png",
      },
      {
        f_name: "Patricia",
        l_name: "Ocampo",
        email: "seed.op.assign.04@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_op_assign_04",
        profile_image: "default.png",
      },
      {
        f_name: "Marvin",
        l_name: "Delos Reyes",
        email: "seed.op.assign.05@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_op_assign_05",
        profile_image: "default.png",
      },
      {
        f_name: "Kristine",
        l_name: "Morales",
        email: "seed.op.assign.06@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_op_assign_06",
        profile_image: "default.png",
      },
      {
        f_name: "Francis",
        l_name: "Tolentino",
        email: "seed.op.assign.07@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_op_assign_07",
        profile_image: "default.png",
      },
      {
        f_name: "Carlo",
        l_name: "Mendoza",
        email: "seed.unassigned.operator@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_unassigned_operator_001",
        profile_image: "default.png",
      },
      {
        f_name: "Paulo",
        l_name: "Sarmiento",
        email: "seed.unassigned.operator2@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_unassigned_operator_002",
        profile_image: "default.png",
      },
      {
        f_name: "Lester",
        l_name: "Villarin",
        email: "seed.unassigned.operator3@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_unassigned_operator_003",
        profile_image: "default.png",
      },
      {
        f_name: "Rowena",
        l_name: "Dalisay",
        email: "seed.unassigned.operator4@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_unassigned_operator_004",
        profile_image: "default.png",
      },
      {
        f_name: "Stefan",
        l_name: "Santiago",
        email: "seed.unassigned.operator5@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_unassigned_operator_005",
        profile_image: "default.png",
      },
      {
        f_name: "Trisha",
        l_name: "Lozada",
        email: "seed.unassigned.operator6@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_unassigned_operator_006",
        profile_image: "default.png",
      },
      {
        f_name: "Virgil",
        l_name: "Acosta",
        email: "seed.unassigned.operator7@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_unassigned_operator_007",
        profile_image: "default.png",
      },
      {
        f_name: "Harold",
        l_name: "Pascual",
        email: "seed.op.smfree.01@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_01",
        profile_image: "default.png",
      },
      {
        f_name: "Imelda",
        l_name: "Rosales",
        email: "seed.op.smfree.02@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_02",
        profile_image: "default.png",
      },
      {
        f_name: "Jerome",
        l_name: "Manansala",
        email: "seed.op.smfree.03@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_03",
        profile_image: "default.png",
      },
      {
        f_name: "Karen",
        l_name: "Sy",
        email: "seed.op.smfree.04@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_04",
        profile_image: "default.png",
      },
      {
        f_name: "Leopoldo",
        l_name: "Aguilar",
        email: "seed.op.smfree.05@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_05",
        profile_image: "default.png",
      },
      {
        f_name: "Maricel",
        l_name: "Vergara",
        email: "seed.op.smfree.06@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_06",
        profile_image: "default.png",
      },
      {
        f_name: "Nestor",
        l_name: "Bautista",
        email: "seed.op.smfree.07@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_07",
        profile_image: "default.png",
      },
      {
        f_name: "Olivia",
        l_name: "Concepcion",
        email: "seed.op.smfree.08@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_08",
        profile_image: "default.png",
      },
      {
        f_name: "Patrick",
        l_name: "Dela Rosa",
        email: "seed.op.smfree.09@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_09",
        profile_image: "default.png",
      },
      {
        f_name: "Quennie",
        l_name: "Mallari",
        email: "seed.op.smfree.10@pasahero.local",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_seed_smfree_op_10",
        profile_image: "default.png",
      },
    ];

    const users = await User.insertMany(
      userSeedRows.map((row) => ({
        ...row,
        status: normalizeUserSeedStatus(row.status),
      })),
    );

    console.log(`✅ Created ${users.length} users`);

    const [
      superAdmin,
      operator1,
      terminalAdmin1,
      user1,
      user2,
      user3,
      user4,
      user5,
      operator2,
      terminalAdmin2,
      user6,
      user7,
      user8,
      operator3,
      operator4,
      operator5,
      operator6,
      operator7,
      unassignedOp1,
      unassignedOp2,
      unassignedOp3,
      unassignedOp4,
      unassignedOp5,
      unassignedOp6,
      unassignedOp7,
      smFreeOp1,
      smFreeOp2,
      smFreeOp3,
      smFreeOp4,
      smFreeOp5,
      smFreeOp6,
      smFreeOp7,
      smFreeOp8,
      smFreeOp9,
      smFreeOp10,
    ] = users;

    // ==========================================
    // 2. CREATE TERMINALS
    // ==========================================
    const terminals = await Terminal.insertMany([
      {
        terminal_name: "SM City Cebu Terminal",
        location_lat: 10.3115,
        location_lng: 123.9185,
        status: "active",
      },
      {
        terminal_name: "Ayala Center Terminal",
        location_lat: 10.3181,
        location_lng: 123.9061,
        status: "active",
      },
      {
        terminal_name: "Carbon Market Terminal",
        location_lat: 10.2935,
        location_lng: 123.9026,
        status: "active",
      },
      {
        terminal_name: "Mandaue City Terminal",
        location_lat: 10.3357,
        location_lng: 123.9421,
        status: "active",
      },
      {
        terminal_name: "IT Park Terminal",
        location_lat: 10.3241,
        location_lng: 123.9044,
        status: "active",
      },
      {
        terminal_name: "Cebu South Bus Terminal",
        location_lat: 10.2476,
        location_lng: 123.8494,
        status: "active",
      },
      {
        terminal_name: "Waterfront Lahug Terminal",
        location_lat: 10.2942,
        location_lng: 123.9171,
        status: "active",
      },
    ]);

    console.log(`✅ Created ${terminals.length} terminals`);

    const [
      smTerminal,
      ayalaTerminal,
      carbonTerminal,
      mandaueTerminal,
      itParkTerminal,
      southBusTerminal,
      waterfrontTerminal,
    ] = terminals;

    await seedDevAdminUsers(smTerminal._id);
    await seedJohnAdminUsers(smTerminal._id);

    await User.updateOne(
      { email: "pedro.reyes@email.com" },
      { $set: { assigned_terminal: smTerminal._id } },
    );
    await User.updateOne(
      { email: "jenny.lim@email.com" },
      { $set: { assigned_terminal: ayalaTerminal._id } },
    );

    await seedAssignedOperators({
      terminalAdminEmail: DEV_TERMINAL_ADMIN.email,
      fallbackTerminalId: smTerminal._id,
    });

    await User.updateMany(
      { email: { $regex: /^seed\.unassigned\.operator/ } },
      {
        $set: {
          assigned_terminal: smTerminal._id,
          created_by: null,
        },
      },
    );

    await User.updateMany(
      { email: { $regex: /^seed\.op\.(assign|smfree)\./ } },
      {
        $set: {
          assigned_terminal: smTerminal._id,
          created_by: null,
        },
      },
    );

    // ==========================================
    // 3. CREATE ROUTES
    // ==========================================
    const routes = await Route.insertMany([
      {
        route_name: "SM to Ayala via Mango Avenue",
        route_code: "01A",
        start_terminal_id: smTerminal._id,
        end_terminal_id: ayalaTerminal._id,
        start_location: { latitude: 10.3115, longitude: 123.9185 },
        end_location: { latitude: 10.3181, longitude: 123.9061 },
        estimated_duration: 45,
        status: "active",
      },
      {
        route_name: "Carbon to Mandaue Express",
        route_code: "02B",
        start_terminal_id: carbonTerminal._id,
        end_terminal_id: mandaueTerminal._id,
        start_location: { latitude: 10.2935, longitude: 123.9026 },
        end_location: { latitude: 10.3357, longitude: 123.9421 },
        estimated_duration: 30,
        status: "active",
      },
      {
        route_name: "IT Park to SM Loop",
        route_code: "03C",
        start_terminal_id: itParkTerminal._id,
        end_terminal_id: smTerminal._id,
        start_location: { latitude: 10.3241, longitude: 123.9044 },
        end_location: { latitude: 10.3115, longitude: 123.9185 },
        estimated_duration: 35,
        status: "active",
      },
      {
        route_name: "Ayala to Carbon Direct",
        route_code: "04D",
        start_terminal_id: ayalaTerminal._id,
        end_terminal_id: carbonTerminal._id,
        start_location: { latitude: 10.3181, longitude: 123.9061 },
        end_location: { latitude: 10.2935, longitude: 123.9026 },
        estimated_duration: 25,
        status: "active",
      },
      {
        route_name: "Mandaue to IT Park Circuit",
        route_code: "05E",
        start_terminal_id: mandaueTerminal._id,
        end_terminal_id: itParkTerminal._id,
        start_location: { latitude: 10.3357, longitude: 123.9421 },
        end_location: { latitude: 10.3241, longitude: 123.9044 },
        estimated_duration: 40,
        status: "active",
      },
      {
        route_name: "South Bus to SM Express",
        route_code: "06F",
        start_terminal_id: southBusTerminal._id,
        end_terminal_id: smTerminal._id,
        start_location: { latitude: 10.2476, longitude: 123.8494 },
        end_location: { latitude: 10.3115, longitude: 123.9185 },
        estimated_duration: 50,
        status: "active",
        route_type: "normal",
      },
      {
        route_name: "Waterfront to Ayala Shuttle",
        route_code: "07G",
        start_terminal_id: waterfrontTerminal._id,
        end_terminal_id: ayalaTerminal._id,
        start_location: { latitude: 10.2942, longitude: 123.9171 },
        end_location: { latitude: 10.3181, longitude: 123.9061 },
        estimated_duration: 20,
        status: "active",
        route_type: "vice_versa",
      },
    ]);

    console.log(`✅ Created ${routes.length} routes`);

    const [
      route01A,
      route02B,
      route03C,
      route04D,
      route05E,
      route06F,
      route07G,
    ] = routes;

    // ==========================================
    // 4. CREATE ROUTE STOPS
    // ==========================================
    const routeStops = await RouteStop.insertMany([
      // Route 01A: SM to Ayala
      {
        route_id: route01A._id,
        stop_name: "SM City Cebu",
        stop_order: 1,
        latitude: 10.3115,
        longitude: 123.9185,
      },
      {
        route_id: route01A._id,
        stop_name: "Mango Square",
        stop_order: 2,
        latitude: 10.3143,
        longitude: 123.9134,
      },
      {
        route_id: route01A._id,
        stop_name: "Capitol Site",
        stop_order: 3,
        latitude: 10.3167,
        longitude: 123.9089,
      },
      {
        route_id: route01A._id,
        stop_name: "Fuente Osmeña",
        stop_order: 4,
        latitude: 10.3156,
        longitude: 123.9023,
      },
      {
        route_id: route01A._id,
        stop_name: "Ayala Center",
        stop_order: 5,
        latitude: 10.3181,
        longitude: 123.9061,
      },

      // Route 02B: Carbon to Mandaue
      {
        route_id: route02B._id,
        stop_name: "Carbon Market",
        stop_order: 1,
        latitude: 10.2935,
        longitude: 123.9026,
      },
      {
        route_id: route02B._id,
        stop_name: "Colon Street",
        stop_order: 2,
        latitude: 10.2965,
        longitude: 123.9001,
      },
      {
        route_id: route02B._id,
        stop_name: "Pier Area",
        stop_order: 3,
        latitude: 10.3012,
        longitude: 123.9067,
      },
      {
        route_id: route02B._id,
        stop_name: "Mandaue City Hall",
        stop_order: 4,
        latitude: 10.3298,
        longitude: 123.9387,
      },
      {
        route_id: route02B._id,
        stop_name: "Mandaue Terminal",
        stop_order: 5,
        latitude: 10.3357,
        longitude: 123.9421,
      },

      // Route 03C: IT Park to SM
      {
        route_id: route03C._id,
        stop_name: "IT Park",
        stop_order: 1,
        latitude: 10.3241,
        longitude: 123.9044,
      },
      {
        route_id: route03C._id,
        stop_name: "JY Square",
        stop_order: 2,
        latitude: 10.3189,
        longitude: 123.9112,
      },
      {
        route_id: route03C._id,
        stop_name: "Gaisano Country Mall",
        stop_order: 3,
        latitude: 10.3145,
        longitude: 123.9156,
      },
      {
        route_id: route03C._id,
        stop_name: "SM City Cebu",
        stop_order: 4,
        latitude: 10.3115,
        longitude: 123.9185,
      },

      // Route 04D: Ayala to Carbon
      {
        route_id: route04D._id,
        stop_name: "Ayala Center",
        stop_order: 1,
        latitude: 10.3181,
        longitude: 123.9061,
      },
      {
        route_id: route04D._id,
        stop_name: "Mabolo Church",
        stop_order: 2,
        latitude: 10.3134,
        longitude: 123.9045,
      },
      {
        route_id: route04D._id,
        stop_name: "Robinsons Cybergate",
        stop_order: 3,
        latitude: 10.3078,
        longitude: 123.9023,
      },
      {
        route_id: route04D._id,
        stop_name: "Carbon Market",
        stop_order: 4,
        latitude: 10.2935,
        longitude: 123.9026,
      },

      // Route 05E: Mandaue to IT Park
      {
        route_id: route05E._id,
        stop_name: "Mandaue Terminal",
        stop_order: 1,
        latitude: 10.3357,
        longitude: 123.9421,
      },
      {
        route_id: route05E._id,
        stop_name: "Parkmall",
        stop_order: 2,
        latitude: 10.3312,
        longitude: 123.9289,
      },
      {
        route_id: route05E._id,
        stop_name: "AS Fortuna",
        stop_order: 3,
        latitude: 10.3278,
        longitude: 123.9145,
      },
      {
        route_id: route05E._id,
        stop_name: "IT Park",
        stop_order: 4,
        latitude: 10.3241,
        longitude: 123.9044,
      },

      // Route 06F: South Bus to SM
      {
        route_id: route06F._id,
        stop_name: "Cebu South Bus Terminal",
        stop_order: 1,
        latitude: 10.2476,
        longitude: 123.8494,
      },
      {
        route_id: route06F._id,
        stop_name: "Talisay City Hall",
        stop_order: 2,
        latitude: 10.2442,
        longitude: 123.8491,
      },
      {
        route_id: route06F._id,
        stop_name: "Natalio B. Bacalso Ave (Highway)",
        stop_order: 3,
        latitude: 10.275,
        longitude: 123.8612,
      },
      {
        route_id: route06F._id,
        stop_name: "SM City Cebu",
        stop_order: 4,
        latitude: 10.3115,
        longitude: 123.9185,
      },

      // Route 07G: Waterfront to Ayala
      {
        route_id: route07G._id,
        stop_name: "Waterfront Lahug",
        stop_order: 1,
        latitude: 10.2942,
        longitude: 123.9171,
      },
      {
        route_id: route07G._id,
        stop_name: "Salinas Drive",
        stop_order: 2,
        latitude: 10.3021,
        longitude: 123.9114,
      },
      {
        route_id: route07G._id,
        stop_name: "Camputhaw",
        stop_order: 3,
        latitude: 10.3098,
        longitude: 123.9075,
      },
      {
        route_id: route07G._id,
        stop_name: "Ayala Center",
        stop_order: 4,
        latitude: 10.3181,
        longitude: 123.9061,
      },
    ]);

    console.log(`✅ Created ${routeStops.length} route stops`);

    // ==========================================
    // 5. CREATE BUSES
    // ==========================================
    const buses = await Bus.insertMany([
      {
        bus_number: "CEB-001",
        plate_number: "ABC-1234",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-002",
        plate_number: "ABC-1235",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-003",
        plate_number: "ABC-1236",
        capacity: 45,
        status: "active",
      },
      {
        bus_number: "CEB-004",
        plate_number: "ABC-1237",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-005",
        plate_number: "ABC-1238",
        capacity: 45,
        status: "maintenance",
      },
      {
        bus_number: "CEB-006",
        plate_number: "ABC-1239",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-007",
        plate_number: "ABC-1240",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-008",
        plate_number: "ABC-1241",
        capacity: 45,
        status: "active",
      },
      {
        bus_number: "CEB-009",
        plate_number: "ABC-1242",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-010",
        plate_number: "ABC-1243",
        capacity: 50,
        status: "out of service",
      },
      {
        bus_number: "CEB-011",
        plate_number: "CEB-9011",
        capacity: 52,
        status: "active",
      },
      {
        bus_number: "CEB-012",
        plate_number: "CEB-9012",
        capacity: 48,
        status: "active",
      },
      {
        bus_number: "CEB-013",
        plate_number: "CEB-9013",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-014",
        plate_number: "CEB-9014",
        capacity: 46,
        status: "active",
      },
      {
        bus_number: "CEB-015",
        plate_number: "CEB-9015",
        capacity: 52,
        status: "active",
      },
      {
        bus_number: "CEB-016",
        plate_number: "CEB-9016",
        capacity: 44,
        status: "maintenance",
      },
      {
        bus_number: "CEB-017",
        plate_number: "CEB-9017",
        capacity: 49,
        status: "active",
      },
      {
        bus_number: "CEB-018",
        plate_number: "CEB-9018",
        capacity: 50,
        status: "out of service",
      },
      {
        bus_number: "CEB-019",
        plate_number: "CEB-9019",
        capacity: 48,
        status: "active",
      },
      {
        bus_number: "CEB-020",
        plate_number: "CEB-9020",
        capacity: 53,
        status: "active",
      },
      {
        bus_number: "CEB-021",
        plate_number: "CEB-9021",
        capacity: 47,
        status: "maintenance",
      },
      {
        bus_number: "CEB-022",
        plate_number: "CEB-9022",
        capacity: 45,
        status: "active",
      },
      {
        bus_number: "CEB-023",
        plate_number: "CEB-9023",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-024",
        plate_number: "CEB-9024",
        capacity: 46,
        status: "out of service",
      },
    ]);

    console.log(`✅ Created ${buses.length} buses`);

    const busById = new Map(buses.map((b) => [String(b._id), b]));

    const busStatuses = await insertBusStatusesForSeedBuses(buses);

    console.log(`✅ Created ${busStatuses.length} bus statuses`);

    const busLocations = await BusLocation.insertMany(
      buses.map((bus, index) => ({
        bus_id: String(bus._id),
        latitude: 10.3115 + index * 0.0012,
        longitude: 123.9185 - index * 0.0011,
        speed:
          bus.status === "active"
            ? 18 + (index % 5) * 3
            : 0,
      })),
    );

    console.log(`✅ Created ${busLocations.length} bus locations`);

    const [
      bus1,
      bus2,
      bus3,
      bus4,
      bus5,
      bus6,
      bus7,
      bus8,
      bus9,
      bus10,
      bus11,
      bus12,
      bus13,
      bus14,
      bus15,
      bus16,
      bus17,
      bus18,
      bus19,
      bus20,
      bus21,
      bus22,
      bus23,
      bus24,
    ] = buses;

    // ==========================================
    // 6. CREATE DRIVERS
    // ==========================================
    const drivers = await Driver.insertMany([
      {
        f_name: "Ramon",
        l_name: "Cruz",
        license_number: "D01-12-345678",
        contact_number: "09171234567",
        status: "active",
      },
      {
        f_name: "Jose",
        l_name: "Bautista",
        license_number: "D01-12-345679",
        contact_number: "09171234568",
        status: "active",
      },
      {
        f_name: "Antonio",
        l_name: "Luna",
        license_number: "D01-12-345680",
        contact_number: "09171234569",
        status: "active",
      },
      {
        f_name: "Miguel",
        l_name: "Ramos",
        license_number: "D01-12-345681",
        contact_number: "09171234570",
        status: "active",
      },
      {
        f_name: "Fernando",
        l_name: "Santos",
        license_number: "D01-12-345682",
        contact_number: "09171234571",
        status: "active",
      },
      {
        f_name: "Roberto",
        l_name: "Torres",
        license_number: "D01-12-345683",
        contact_number: "09171234572",
        status: "active",
      },
      {
        f_name: "Eduardo",
        l_name: "Gomez",
        license_number: "D01-12-345684",
        contact_number: "09171234573",
        status: "inactive",
      },
      {
        f_name: "Paolo",
        l_name: "Navarro",
        license_number: "D01-12-345685",
        contact_number: "09171234574",
        status: "active",
      },
      {
        f_name: "Luis",
        l_name: "Fernandez",
        license_number: "D01-12-345686",
        contact_number: "09171234575",
        status: "active",
      },
      {
        f_name: "Daniel",
        l_name: "Mercado",
        license_number: "SM-UNASSIGNED-DRIVER-001",
        contact_number: "09990000001",
        status: "active",
      },
      {
        f_name: "Erwin",
        l_name: "Salazar",
        license_number: "SM-UNASSIGNED-DRIVER-002",
        contact_number: "09990000002",
        status: "active",
      },
      {
        f_name: "Joel",
        l_name: "Fernandez",
        license_number: "SM-UNASSIGNED-DRIVER-003",
        contact_number: "09990000003",
        status: "active",
      },
      {
        f_name: "Gemma",
        l_name: "Aquino",
        license_number: "D01-12-345687",
        contact_number: "09171234576",
        status: "active",
      },
      {
        f_name: "Aldrin",
        l_name: "Jacinto",
        license_number: "D01-SEED-SM-DEMO-01",
        contact_number: "09991000001",
        status: "active",
      },
      {
        f_name: "Benjie",
        l_name: "Mariano",
        license_number: "D01-SEED-SM-DEMO-02",
        contact_number: "09991000002",
        status: "active",
      },
      {
        f_name: "Cedric",
        l_name: "Panganiban",
        license_number: "D01-SEED-SM-DEMO-03",
        contact_number: "09991000003",
        status: "active",
      },
      {
        f_name: "Dante",
        l_name: "Alcaraz",
        license_number: "D01-SEED-SM-DEMO-04",
        contact_number: "09991000004",
        status: "active",
      },
      {
        f_name: "Edwin",
        l_name: "Salcedo",
        license_number: "D01-SEED-SM-DEMO-05",
        contact_number: "09991000005",
        status: "active",
      },
      {
        f_name: "Froilan",
        l_name: "Cruz",
        license_number: "D01-SEED-SM-DEMO-06",
        contact_number: "09991000006",
        status: "active",
      },
      {
        f_name: "Glenn",
        l_name: "Espiritu",
        license_number: "D01-SEED-SM-DEMO-07",
        contact_number: "09991000007",
        status: "active",
      },
      {
        f_name: "Hubert",
        l_name: "Nuñez",
        license_number: "D01-SEED-SM-DEMO-08",
        contact_number: "09991000008",
        status: "active",
      },
      {
        f_name: "Ivan",
        l_name: "Montecillo",
        license_number: "D01-SEED-SM-DEMO-09",
        contact_number: "09991000009",
        status: "active",
      },
      {
        f_name: "Julius",
        l_name: "Ramirez",
        license_number: "D01-SEED-SM-DEMO-10",
        contact_number: "09991000010",
        status: "active",
      },
    ]);

    console.log(`✅ Created ${drivers.length} drivers`);

    const [
      driver1,
      driver2,
      driver3,
      driver4,
      driver5,
      driver6,
      driver7,
      driver8,
      driver9,
      driver10,
      driver11,
      driver12,
      driver13,
    ] = drivers;

    // ==========================================
    // 7. CREATE USER SUBSCRIPTIONS
    // ==========================================
    const subscriptions = await UserSubscription.insertMany([
      // User1 (Ana) - subscribes to Route 01A and Bus CEB-001
      { user_id: user1._id, route_id: route01A._id, bus_id: null },
      { user_id: user1._id, route_id: null, bus_id: bus1._id },

      // User2 (Carlos) - subscribes to Route 02B and Route 03C
      { user_id: user2._id, route_id: route02B._id, bus_id: null },
      { user_id: user2._id, route_id: route03C._id, bus_id: null },

      // User3 (Lisa) - subscribes to Bus CEB-002 and Route 04D
      { user_id: user3._id, route_id: route04D._id, bus_id: null },
      { user_id: user3._id, route_id: null, bus_id: bus2._id },

      // User4 (Mark) - subscribes to Route 01A and Bus CEB-003
      { user_id: user4._id, route_id: route01A._id, bus_id: null },
      { user_id: user4._id, route_id: null, bus_id: bus3._id },

      // User5 (Sofia) - subscribes to Route 05E and multiple buses
      { user_id: user5._id, route_id: route05E._id, bus_id: null },
      { user_id: user5._id, route_id: null, bus_id: bus1._id },
      { user_id: user5._id, route_id: null, bus_id: bus4._id },

      // Some users subscribe to same routes (for testing broadcast)
      { user_id: user1._id, route_id: route03C._id, bus_id: null },
      { user_id: user3._id, route_id: route01A._id, bus_id: null },

      { user_id: user6._id, route_id: route06F._id, bus_id: null },
      { user_id: user6._id, route_id: null, bus_id: bus11._id },
      { user_id: user7._id, route_id: route07G._id, bus_id: null },
      { user_id: user7._id, route_id: null, bus_id: bus9._id },
      { user_id: user8._id, route_id: route04D._id, bus_id: null },
    ]);

    console.log(`✅ Created ${subscriptions.length} user subscriptions`);

    // ==========================================
    // 8. CREATE BUS ASSIGNMENTS
    // ==========================================
    const todayAnchor = new Date();
    const today = new Date(
      Date.UTC(
        todayAnchor.getUTCFullYear(),
        todayAnchor.getUTCMonth(),
        todayAnchor.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const assignmentSeedRows = [
      // CEB-001: multiple assignments (past completed / cancelled + current pending)
      {
        bus_id: bus1._id,
        driver_id: driver2._id,
        operator_user_id: operator1._id,
        route_id: route01A._id,
        assignment_status: "inactive",
        assignment_result: "completed",
        scheduled_arrival_at: new Date(today.getTime() - 6 * 60 * 60 * 1000),
      },
      {
        bus_id: bus1._id,
        driver_id: driver3._id,
        operator_user_id: operator1._id,
        route_id: route03C._id,
        assignment_status: "inactive",
        assignment_result: "cancelled",
        scheduled_arrival_at: new Date(today.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        bus_id: bus1._id,
        driver_id: driver1._id,
        operator_user_id: operator1._id,
        route_id: route01A._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(
          today.getTime() + 8.75 * 60 * 60 * 1000,
        ),
      },
      {
        bus_id: bus2._id,
        driver_id: driver2._id,
        operator_user_id: operator2._id,
        route_id: route02B._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(
          today.getTime() + 9.5 * 60 * 60 * 1000,
        ),
      },
      {
        bus_id: bus3._id,
        driver_id: driver3._id,
        operator_user_id: operator2._id,
        route_id: route03C._id,
        assignment_status: "inactive",
        assignment_result: "completed",
        scheduled_arrival_at: new Date(
          today.getTime() + 7.58 * 60 * 60 * 1000,
        ),
      },
      {
        bus_id: bus4._id,
        driver_id: driver4._id,
        operator_user_id: operator3._id,
        route_id: route04D._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(
          today.getTime() + 10.42 * 60 * 60 * 1000,
        ),
      },
      {
        bus_id: bus6._id,
        driver_id: driver5._id,
        operator_user_id: operator4._id,
        route_id: route05E._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(
          today.getTime() + 11.67 * 60 * 60 * 1000,
        ),
      },
      {
        bus_id: bus11._id,
        driver_id: driver8._id,
        operator_user_id: operator5._id,
        route_id: route06F._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(
          today.getTime() + 12.83 * 60 * 60 * 1000,
        ),
      },
      {
        bus_id: bus12._id,
        driver_id: driver9._id,
        operator_user_id: unassignedOp1._id,
        route_id: route07G._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(
          today.getTime() + 6.83 * 60 * 60 * 1000,
        ),
      },
      {
        bus_id: bus9._id,
        driver_id: driver6._id,
        operator_user_id: unassignedOp2._id,
        route_id: route02B._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(
          today.getTime() + 24 * 60 * 60 * 1000 + 14.5 * 60 * 60 * 1000,
        ),
      },
      {
        bus_id: bus13._id,
        driver_id: driver4._id,
        operator_user_id: operator2._id,
        route_id: route01A._id,
        assignment_status: "inactive",
        assignment_result: "completed",
        scheduled_arrival_at: new Date(today.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        bus_id: bus14._id,
        driver_id: driver13._id,
        operator_user_id: unassignedOp3._id,
        route_id: route05E._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(today.getTime() + 2.25 * 60 * 60 * 1000),
      },
      {
        bus_id: bus15._id,
        driver_id: driver11._id,
        operator_user_id: smFreeOp1._id,
        route_id: route06F._id,
        assignment_status: "inactive",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(today.getTime() + 26 * 60 * 60 * 1000),
      },
      // CEB-017: one bus, multiple assignments (past completed, cancelled, current pending)
      {
        bus_id: bus17._id,
        driver_id: driver1._id,
        operator_user_id: operator1._id,
        route_id: route01A._id,
        assignment_status: "inactive",
        assignment_result: "completed",
        scheduled_arrival_at: new Date(today.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        bus_id: bus17._id,
        driver_id: driver2._id,
        operator_user_id: operator1._id,
        route_id: route02B._id,
        assignment_status: "inactive",
        assignment_result: "cancelled",
        scheduled_arrival_at: new Date(today.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        bus_id: bus17._id,
        driver_id: driver3._id,
        operator_user_id: operator6._id,
        route_id: route03C._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(today.getTime() + 1.5 * 60 * 60 * 1000),
      },
      {
        bus_id: bus19._id,
        driver_id: driver10._id,
        operator_user_id: operator7._id,
        route_id: route04D._id,
        assignment_status: "active",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(today.getTime() + 3.5 * 60 * 60 * 1000),
      },
      {
        bus_id: bus20._id,
        driver_id: driver1._id,
        operator_user_id: operator1._id,
        route_id: route02B._id,
        assignment_status: "inactive",
        assignment_result: "completed",
        scheduled_arrival_at: new Date(today.getTime() - 3.5 * 60 * 60 * 1000),
      },
      {
        bus_id: bus22._id,
        driver_id: driver12._id,
        operator_user_id: smFreeOp2._id,
        route_id: route07G._id,
        assignment_status: "inactive",
        assignment_result: "pending",
        scheduled_arrival_at: new Date(today.getTime() + 30 * 60 * 60 * 1000),
      },
      {
        bus_id: bus23._id,
        driver_id: driver9._id,
        operator_user_id: operator1._id,
        route_id: route01A._id,
        assignment_status: "inactive",
        assignment_result: "cancelled",
        scheduled_arrival_at: new Date(today.getTime() + 7 * 60 * 60 * 1000),
      },
    ];

    const assignments = await BusAssignment.insertMany(
      assignmentSeedRows
        .map((row) => normalizeSeedBusAssignment(row, busById))
        .filter(Boolean),
    );

    console.log(`✅ Created ${assignments.length} bus assignments`);

    const [
      assignment1,
      assignment2,
      assignment3,
      assignment4,
      assignment5,
      assignment6,
      assignment7,
      assignment8,
    ] = assignments;

    // ==========================================
    // 9. CREATE NOTIFICATIONS
    // ==========================================
    const now = new Date();

    const notifications = await Notification.insertMany([
      // 1. System-wide announcement
      {
        sender_id: superAdmin._id,
        bus_id: null,
        route_id: null,
        terminal_id: null,
        title: "System Maintenance Notice",
        message:
          "The bus tracking system will undergo maintenance on April 30, 2026 from 2:00 AM to 4:00 AM. Real-time tracking may be temporarily unavailable.",
        notification_type: "info",
        priority: "high",
        scope: "system",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      },

      // 2. Bus delay notification (for bus CEB-001)
      {
        sender_id: operator1._id,
        bus_id: bus1._id,
        route_id: route01A._id,
        terminal_id: null,
        title: "Bus CEB-001 Delayed",
        message:
          "Bus CEB-001 on Route 01A (SM to Ayala) is running 6 minutes behind schedule due to heavy traffic on Mango Avenue.",
        notification_type: "delay",
        priority: "medium",
        scope: "bus",
        createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
      },

      // 3. Bus full notification
      {
        sender_id: operator1._id,
        bus_id: bus1._id,
        route_id: route01A._id,
        terminal_id: null,
        title: "Bus CEB-001 at Full Capacity",
        message:
          "Bus CEB-001 is currently at full capacity (50/50 passengers). Please wait for the next bus or consider alternative routes.",
        notification_type: "full",
        priority: "medium",
        scope: "bus",
        createdAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
      },

      // 4. Route-wide notification
      {
        sender_id: operator2._id,
        bus_id: null,
        route_id: route02B._id,
        terminal_id: null,
        title: "Route 02B Service Update",
        message:
          "Additional buses have been deployed on Route 02B (Carbon to Mandaue) due to high demand during rush hour.",
        notification_type: "info",
        priority: "low",
        scope: "route",
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      },

      // 5. Skipped stop notification
      {
        sender_id: operator1._id,
        bus_id: bus1._id,
        route_id: route01A._id,
        terminal_id: null,
        title: "Stop Skipped - Mango Square",
        message:
          "Bus CEB-001 has skipped Mango Square stop due to road construction. The bus will resume normal stops at Capitol Site.",
        notification_type: "skipped_stop",
        priority: "high",
        scope: "bus",
        createdAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
      },

      // 6. Terminal notification
      {
        sender_id: terminalAdmin1._id,
        bus_id: null,
        route_id: null,
        terminal_id: smTerminal._id,
        title: "SM Terminal Parking Update",
        message:
          "Bay 3 and Bay 4 at SM Terminal are temporarily closed for repairs. Buses will use alternative bays.",
        notification_type: "info",
        priority: "medium",
        scope: "terminal",
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      },

      // 7. Another bus delay (for subscribed users)
      {
        sender_id: operator2._id,
        bus_id: bus3._id,
        route_id: route03C._id,
        terminal_id: null,
        title: "Bus CEB-003 Minor Delay",
        message:
          "Bus CEB-003 on Route 03C (IT Park to SM) experienced a 2-minute delay but has now completed its trip.",
        notification_type: "delay",
        priority: "low",
        scope: "bus",
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      },

      // 8. Route maintenance
      {
        sender_id: superAdmin._id,
        bus_id: null,
        route_id: route05E._id,
        terminal_id: null,
        title: "Route 05E Schedule Change",
        message:
          "Starting May 1, 2026, Route 05E will have updated departure times. First bus at 6:00 AM, last bus at 10:00 PM.",
        notification_type: "info",
        priority: "high",
        scope: "route",
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      },

      // 9. Bus back in service
      {
        sender_id: operator1._id,
        bus_id: bus5._id,
        route_id: null,
        terminal_id: null,
        title: "Bus CEB-005 Maintenance Complete",
        message:
          "Bus CEB-005 has completed scheduled maintenance and will resume service tomorrow morning.",
        notification_type: "info",
        priority: "low",
        scope: "bus",
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      },

      // 10. Terminal congestion
      {
        sender_id: terminalAdmin2._id,
        bus_id: null,
        route_id: null,
        terminal_id: ayalaTerminal._id,
        title: "Ayala Terminal High Traffic",
        message:
          "Ayala Terminal is experiencing higher than usual foot traffic. Please allow extra time for boarding.",
        notification_type: "info",
        priority: "medium",
        scope: "terminal",
        createdAt: new Date(now.getTime() - 20 * 60 * 1000), // 20 minutes ago
      },

      {
        sender_id: superAdmin._id,
        bus_id: null,
        route_id: null,
        terminal_id: null,
        title: "Peak Season Travel Advisory",
        message:
          "Expect heavier passenger volume on provincial and mall-linked routes this weekend. Arrive at terminals at least 15 minutes before departure.",
        notification_type: "info",
        priority: "medium",
        scope: "system",
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },

      {
        sender_id: operator1._id,
        bus_id: null,
        route_id: route06F._id,
        terminal_id: null,
        title: "Route 06F Extra Morning Trip",
        message:
          "An additional southbound trip on Route 06F (South Bus to SM) departs at 5:45 AM on weekdays until further notice.",
        notification_type: "info",
        priority: "medium",
        scope: "route",
        createdAt: new Date(now.getTime() - 90 * 60 * 1000),
      },

      {
        sender_id: operator1._id,
        bus_id: bus9._id,
        route_id: route02B._id,
        terminal_id: null,
        title: "Bus CEB-009 On Schedule",
        message:
          "Bus CEB-009 on Route 02B is on time for tomorrow's 2:00 PM departure from Carbon Market Terminal.",
        notification_type: "info",
        priority: "low",
        scope: "bus",
        createdAt: new Date(now.getTime() - 10 * 60 * 1000),
      },
    ]);

    console.log(`✅ Created ${notifications.length} notifications`);

    const [
      notif1,
      notif2,
      notif3,
      notif4,
      notif5,
      notif6,
      notif7,
      notif8,
      notif9,
      notif10,
      notif11,
      notif12,
      notif13,
    ] = notifications;

    // ==========================================
    // 10. CREATE USER NOTIFICATIONS
    // ==========================================
    const userNotifications = await UserNotification.insertMany([
      // User1 (Ana) - subscribed to Route 01A and Bus CEB-001
      {
        user_id: user1._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
      },
      { user_id: user1._id, notification_id: notif2._id, is_read: false }, // Bus CEB-001 delay
      { user_id: user1._id, notification_id: notif3._id, is_read: false }, // Bus CEB-001 full
      {
        user_id: user1._id,
        notification_id: notif5._id,
        is_read: true,
        read_at: new Date(now.getTime() - 40 * 60 * 1000),
      }, // Bus CEB-001 skip
      { user_id: user1._id, notification_id: notif7._id, is_read: false }, // Route 03C (also subscribed)

      // User2 (Carlos) - subscribed to Route 02B and Route 03C
      { user_id: user2._id, notification_id: notif1._id, is_read: false },
      {
        user_id: user2._id,
        notification_id: notif4._id,
        is_read: true,
        read_at: new Date(now.getTime() - 50 * 60 * 1000),
      }, // Route 02B
      { user_id: user2._id, notification_id: notif7._id, is_read: false }, // Route 03C

      // User3 (Lisa) - subscribed to Route 04D and Bus CEB-002
      {
        user_id: user3._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
      { user_id: user3._id, notification_id: notif2._id, is_read: false }, // Also subscribed to Route 01A
      { user_id: user3._id, notification_id: notif3._id, is_read: false },
      { user_id: user3._id, notification_id: notif5._id, is_read: false },

      // User4 (Mark) - subscribed to Route 01A and Bus CEB-003
      { user_id: user4._id, notification_id: notif1._id, is_read: false },
      {
        user_id: user4._id,
        notification_id: notif2._id,
        is_read: true,
        read_at: new Date(now.getTime() - 25 * 60 * 1000),
      },
      { user_id: user4._id, notification_id: notif3._id, is_read: false },
      { user_id: user4._id, notification_id: notif5._id, is_read: false },
      {
        user_id: user4._id,
        notification_id: notif7._id,
        is_read: true,
        read_at: new Date(now.getTime() - 3.5 * 60 * 60 * 1000),
      }, // Bus CEB-003

      // User5 (Sofia) - subscribed to Route 05E and Buses CEB-001, CEB-004
      {
        user_id: user5._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1.8 * 60 * 60 * 1000),
      },
      { user_id: user5._id, notification_id: notif2._id, is_read: false }, // Bus CEB-001
      { user_id: user5._id, notification_id: notif3._id, is_read: false }, // Bus CEB-001
      { user_id: user5._id, notification_id: notif5._id, is_read: false }, // Bus CEB-001
      {
        user_id: user5._id,
        notification_id: notif8._id,
        is_read: true,
        read_at: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      }, // Route 05E

      // Operators and admins get all system notifications
      {
        user_id: operator1._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1.9 * 60 * 60 * 1000),
      },
      {
        user_id: operator1._id,
        notification_id: notif6._id,
        is_read: true,
        read_at: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      },
      { user_id: operator1._id, notification_id: notif10._id, is_read: false },

      {
        user_id: operator2._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1.7 * 60 * 60 * 1000),
      },
      {
        user_id: operator2._id,
        notification_id: notif4._id,
        is_read: true,
        read_at: new Date(now.getTime() - 55 * 60 * 1000),
      },

      {
        user_id: terminalAdmin1._id,
        notification_id: notif1._id,
        is_read: false,
      },
      {
        user_id: terminalAdmin1._id,
        notification_id: notif6._id,
        is_read: true,
        read_at: new Date(now.getTime() - 2.8 * 60 * 60 * 1000),
      },

      {
        user_id: terminalAdmin2._id,
        notification_id: notif1._id,
        is_read: false,
      },
      {
        user_id: terminalAdmin2._id,
        notification_id: notif10._id,
        is_read: true,
        read_at: new Date(now.getTime() - 15 * 60 * 1000),
      },

      {
        user_id: superAdmin._id,
        notification_id: notif2._id,
        is_read: true,
        read_at: new Date(now.getTime() - 28 * 60 * 1000),
      },
      {
        user_id: superAdmin._id,
        notification_id: notif3._id,
        is_read: true,
        read_at: new Date(now.getTime() - 12 * 60 * 1000),
      },
      {
        user_id: superAdmin._id,
        notification_id: notif5._id,
        is_read: true,
        read_at: new Date(now.getTime() - 42 * 60 * 1000),
      },

      { user_id: user6._id, notification_id: notif1._id, is_read: false },
      { user_id: user6._id, notification_id: notif11._id, is_read: false },
      { user_id: user6._id, notification_id: notif12._id, is_read: false },

      {
        user_id: user7._id,
        notification_id: notif11._id,
        is_read: true,
        read_at: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      { user_id: user7._id, notification_id: notif13._id, is_read: false },
      { user_id: user7._id, notification_id: notif1._id, is_read: false },

      { user_id: user8._id, notification_id: notif1._id, is_read: false },
      { user_id: user8._id, notification_id: notif8._id, is_read: false },

      {
        user_id: operator1._id,
        notification_id: notif12._id,
        is_read: true,
        read_at: new Date(now.getTime() - 85 * 60 * 1000),
      },
      { user_id: operator1._id, notification_id: notif13._id, is_read: false },
    ]);

    console.log(`✅ Created ${userNotifications.length} user notifications`);

    // ==========================================
    // 11. CREATE SYSTEM LOGS
    // ==========================================
    const systemLogs = await SystemLog.insertMany(
      buildSystemLogDocuments({
        superAdmin,
        operator1,
        operator2,
        terminalAdmin1,
        terminalAdmin2,
        driver1,
        driver8,
        now,
      }),
    );

    console.log(`✅ Created ${systemLogs.length} system logs`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log("\n📊 SEED DATA SUMMARY:");
    console.log("=====================");
    const userTotal = await User.countDocuments();
    console.log(`Users: ${userTotal}`);
    console.log(`  - Super Admins: ${await User.countDocuments({ role: "super admin" })}`);
    console.log(`  - Operators: ${await User.countDocuments({ role: "operator" })}`);
    console.log(`  - Terminal Admins: ${await User.countDocuments({ role: "terminal admin" })}`);
    console.log(`  - Regular Users: ${await User.countDocuments({ role: "user" })}`);
    console.log(`Terminals: ${terminals.length}`);
    console.log(`Routes: ${routes.length}`);
    console.log(`Route Stops: ${routeStops.length}`);
    console.log(`Buses: ${buses.length}`);
    console.log(`Bus Statuses: ${busStatuses.length}`);
    console.log(`Bus Locations: ${busLocations.length}`);
    console.log(`Drivers: ${drivers.length}`);
    console.log(`Bus Assignments: ${assignments.length}`);
    const notificationCount = await Notification.countDocuments();
    const userNotificationCount = await UserNotification.countDocuments();
    console.log(`Notifications (after timeline seed): ${notificationCount}`);
    console.log(`User Notifications (after timeline seed): ${userNotificationCount}`);
    console.log(`User Subscriptions: ${subscriptions.length}`);
    console.log(`System Logs: ${systemLogs.length}`);

    // ==========================================
    // 12. RUN ADDITIONAL SEEDERS
    // ==========================================
    await seedTerminalNotificationTimeline();
    console.log("✅ Ran notification timeline seeder");

    await seedHighPrioritySmTerminalNotifications();
    console.log("✅ Ran high-priority SM terminal notifications seeder");

    await seedOperationalSummaryDemo();
    console.log("✅ Ran terminal operational summary seeder");

    await seedUserNotifications();
    console.log("✅ Ran user notifications seeder");

    console.log("\n✅ Seed data created successfully!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

// Execute if run directly
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
      return seedData();
    })
    .then(() => {
      console.log("🎉 Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}

export default seedData;
