/**
 * Seeds TerminalLog rows and BusAssignment ETAs for testing
 * GET /api/terminals/:id/operational-summary?date=2026-04-17
 *
 * Prerequisite: run `npm run seed` first (allSchema.seeder.js).
 * Then: `npm run seed:operational-summary`
 *
 * Demo terminal: SM City Cebu Terminal (routes 03C & 06F end here).
 * Date: 04/17/2026 (April 17, 2026 UTC).
 */
import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import Terminal from "../modules/terminal/terminal.model.js";
import Route from "../modules/route/route.model.js";
import BusAssignment from "../modules/bus_assignment/bus_assignment.model.js";
import TerminalLog from "../modules/terminal_log/terminal_log.model.js";
import Bus from "../modules/bus/bus.model.js";
import Driver from "../modules/driver/driver.model.js";
import User from "../modules/user/user.model.js";

/** April 17, 2026 — UTC (matches ?date=2026-04-17 on the API). */
function utc2026_04_17(hour, minute = 0) {
  return new Date(Date.UTC(2026, 3, 17, hour, minute, 0));
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

async function seedOperationalSummaryDemo() {
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

  const operator = await User.findOne({ role: "operator" });
  if (!operator) {
    throw new Error('No user with role "operator". Run `npm run seed` first.');
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
          scheduled_arrival_at: utc2026_04_17(h, (i % 4) * 15),
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

  const extraPayload = extraSpecs.map(([busIdx, use06F, h, m]) => ({
    bus_id: demoBuses[busIdx]._id,
    driver_id: drivers[busIdx]._id,
    operator_user_id: operator._id,
    route_id: use06F ? route06F._id : route03C._id,
    assignment_status: "active",
    assignment_result: "pending",
    scheduled_arrival_at: utc2026_04_17(h, m),
  }));

  await BusAssignment.insertMany(extraPayload);

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
      event_time: utc2026_04_17(8, 0),
      confirmation_time: utc2026_04_17(8, 5),
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
      event_time: utc2026_04_17(12, 0),
      confirmation_time: utc2026_04_17(12, 10),
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
      event_time: utc2026_04_17(6, 15),
      confirmation_time: utc2026_04_17(6, 18),
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
      event_time: utc2026_04_17(7, 25),
      confirmation_time: utc2026_04_17(7, 28),
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
      event_time: utc2026_04_17(16, 0),
      confirmation_time: utc2026_04_17(16, 5),
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
      event_time: utc2026_04_17(16, 45),
      confirmation_time: utc2026_04_17(16, 48),
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
      event_time: utc2026_04_17(10, 0),
      confirmation_time: utc2026_04_17(10, 3),
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
      event_time: utc2026_04_17(13, 10),
      confirmation_time: utc2026_04_17(13, 14),
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
      event_time: utc2026_04_17(14, 50),
      confirmation_time: utc2026_04_17(14, 55),
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
      event_time: utc2026_04_17(9, 20),
      confirmation_time: null,
      reported_by: operator._id,
      auto_detected: false,
    },
    {
      bus_assignment_id: a4._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[2]._id,
      event_type: "arrival",
      status: "pending",
      event_time: utc2026_04_17(8, 40),
      confirmation_time: null,
      reported_by: operator._id,
      auto_detected: false,
    },
    // --- Pending departure (2 buses) ---
    {
      bus_assignment_id: a7._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[5]._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utc2026_04_17(11, 0),
      confirmation_time: utc2026_04_17(11, 4),
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
      event_time: utc2026_04_17(11, 45),
      confirmation_time: null,
      reported_by: operator._id,
      auto_detected: false,
    },
    {
      bus_assignment_id: a6._id,
      terminal_id: smTerminal._id,
      bus_id: demoBuses[4]._id,
      event_type: "arrival",
      status: "confirmed",
      event_time: utc2026_04_17(12, 5),
      confirmation_time: utc2026_04_17(12, 8),
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
      event_time: utc2026_04_17(12, 55),
      confirmation_time: null,
      reported_by: operator._id,
      auto_detected: false,
    },
    // CEB-008 / a8: scheduled only — no logs
  ]);

  const totalSmAssignments = smAssignments.length + extraSpecs.length;

  console.log("\n✅ Terminal operational summary demo (2026-04-17 UTC)");
  console.log("   Terminal:", smTerminal.terminal_name, `(${smTerminal._id})`);
  console.log("   Date: 04/17/2026 (UTC)");
  console.log("   TerminalLog events:", logs.length);
  console.log("   SM assignments (scheduled that day):", totalSmAssignments);
  console.log("\n   GET /api/terminals/" + String(smTerminal._id) + "/operational-summary?date=2026-04-17");
  console.log("   Expected ≈ scheduled: 11, present: 3, departed_today: 3, pending: 4 (2+2)\n");
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (isDirectRun) {
  if (!process.env.MONGO_DB_URI) {
    console.error(
      "❌ Missing MONGO_DB_URI. Ensure server/.env exists (see allSchema seeder).",
    );
    process.exit(1);
  }

  mongoose
    .connect(process.env.MONGO_DB_URI)
    .then(() => {
      console.log("📦 Connected to MongoDB");
      return seedOperationalSummaryDemo();
    })
    .then(() => {
      console.log("🎉 Operational summary seed complete!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("💥 Seed failed:", err.message);
      process.exit(1);
    });
}

export default seedOperationalSummaryDemo;
