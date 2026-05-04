/**
 * Seeds SystemLog audit rows. Prerequisite: run `npm run seed` first
 * (or ensure the standard demo users and drivers exist).
 *
 * Run only system logs: `node seeders/systemLogs.seeder.js`
 */
import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import User from "../modules/user/user.model.js";
import Driver from "../modules/driver/driver.model.js";
import SystemLog from "../modules/system_log/system_log.model.js";

/** @param {{ superAdmin: object, operator1: object, operator2: object, terminalAdmin1: object, terminalAdmin2: object, driver1: object, driver8: object, now: Date }} p */
export function buildSystemLogDocuments({
  superAdmin,
  operator1,
  operator2,
  terminalAdmin1,
  terminalAdmin2,
  driver1,
  driver8,
  now,
}) {
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
  return [
    {
      user_id: String(superAdmin._id),
      action: "Login",
      description: "Super admin logged in from web console.",
      createdAt: hoursAgo(48),
    },
    {
      user_id: String(operator1._id),
      action: "Login",
      description: "Operator logged in from mobile app.",
      createdAt: hoursAgo(36),
    },
    {
      user_id: String(superAdmin._id),
      action: "Create Operator",
      description: "Created operator account rico.alvarez@email.com.",
      createdAt: hoursAgo(72),
    },
    {
      user_id: String(superAdmin._id),
      action: "Update Operator",
      description:
        "Updated operator maria.santos@email.com profile and status fields.",
      createdAt: hoursAgo(24),
    },
    {
      user_id: String(operator1._id),
      action: "Create Route",
      description: "Added route 07G (Waterfront to Ayala Shuttle).",
      createdAt: hoursAgo(120),
    },
    {
      user_id: String(operator2._id),
      action: "Update Route",
      description: "Adjusted estimated duration for route 02B.",
      createdAt: hoursAgo(96),
    },
    {
      user_id: String(superAdmin._id),
      action: "Suspend Route",
      description:
        "Suspended legacy test route (code TMP-99) pending archival.",
      createdAt: hoursAgo(168),
    },
    {
      user_id: String(terminalAdmin1._id),
      action: "Create Terminal",
      description: "Registered Waterfront Lahug Terminal.",
      createdAt: hoursAgo(200),
    },
    {
      user_id: String(terminalAdmin2._id),
      action: "Update Terminal",
      description: "Updated Ayala Center Terminal status and coordinates.",
      createdAt: hoursAgo(12),
    },
    {
      user_id: String(superAdmin._id),
      action: "Update Terminal",
      description:
        "Marked deprecated pop-up terminal inactive and cleared operational flags.",
      createdAt: hoursAgo(240),
    },
    {
      user_id: String(operator1._id),
      action: "Assign Bus",
      description: `Assigned CEB-001 to route 01A with driver ${driver1.f_name} ${driver1.l_name}.`,
      createdAt: hoursAgo(6),
    },
    {
      user_id: String(operator2._id),
      action: "Assign Bus",
      description: `Scheduled CEB-011 on route 06F with driver ${driver8.f_name} ${driver8.l_name}.`,
      createdAt: hoursAgo(4),
    },
    {
      user_id: String(operator1._id),
      action: "Remove Bus Assignment",
      description: "Cancelled same-day assignment for CEB-005 (maintenance).",
      createdAt: hoursAgo(3),
    },
    {
      user_id: String(terminalAdmin1._id),
      action: "Logout",
      description: "Session ended from SM terminal kiosk.",
      createdAt: hoursAgo(2),
    },
    {
      user_id: String(operator1._id),
      action: "Suspend Operator",
      description: "Suspended duplicate staging operator account.",
      createdAt: hoursAgo(18),
    },
  ];
}

export async function seedSystemLogsOnly() {
  const needOwnConnection = mongoose.connection.readyState !== 1;
  if (needOwnConnection) {
    if (!process.env.MONGO_DB_URI) {
      throw new Error(
        "Missing MONGO_DB_URI. Ensure server/.env exists and is loaded.",
      );
    }
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log("📦 Connected to MongoDB");
  }

  try {
    const [
      superAdmin,
      operator1,
      operator2,
      terminalAdmin1,
      terminalAdmin2,
      driver1,
      driver8,
    ] = await Promise.all([
      User.findOne({ role: "super admin" }),
      User.findOne({ email: "maria.santos@email.com" }),
      User.findOne({ email: "rico.alvarez@email.com" }),
      User.findOne({ email: "pedro.reyes@email.com" }),
      User.findOne({ email: "jenny.lim@email.com" }),
      Driver.findOne({ license_number: "D01-12-345678" }),
      Driver.findOne({ license_number: "D01-12-345685" }),
    ]);

    if (
      !superAdmin ||
      !operator1 ||
      !operator2 ||
      !terminalAdmin1 ||
      !terminalAdmin2 ||
      !driver1 ||
      !driver8
    ) {
      throw new Error(
        "Missing users or drivers. Run `npm run seed` in server/ first.",
      );
    }

    const now = new Date();
    await SystemLog.deleteMany({});
    const docs = buildSystemLogDocuments({
      superAdmin,
      operator1,
      operator2,
      terminalAdmin1,
      terminalAdmin2,
      driver1,
      driver8,
      now,
    });
    const systemLogs = await SystemLog.insertMany(docs);
    console.log(`✅ Created ${systemLogs.length} system logs`);
    return systemLogs;
  } finally {
    if (needOwnConnection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (isDirectRun) {
  (async () => {
    try {
      console.log("ℹ️ Running system logs seeder...");
      await seedSystemLogsOnly();
      console.log("🎉 System logs seed complete!");
    } catch (err) {
      console.error("💥 Seed failed:", err.message);
      process.exitCode = 1;
    }
    process.exit(process.exitCode ?? 0);
  })();
}

export default seedSystemLogsOnly;
