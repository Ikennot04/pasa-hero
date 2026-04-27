import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import User from "../modules/user/user.model.js";
import Terminal from "../modules/terminal/terminal.model.js";
import { getRoleId } from "../utils/roleMapper.js";

const USER_STATUS_ACTIVE = "active";

function requireMongoUri() {
  const uri = process.env.MONGO_DB_URI?.trim();
  if (!uri) {
    throw new Error(
      "Missing MONGO_DB_URI. Add it to server/.env before running this seeder.",
    );
  }
  return uri;
}

function readCredentials() {
  return {
    superAdmin: {
      email:
        process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase() ||
        "superadmin@pasahero.com",
      password:
        process.env.SEED_SUPER_ADMIN_PASSWORD?.trim() || "SuperAdmin@123",
      f_name: process.env.SEED_SUPER_ADMIN_FNAME?.trim() || "Super",
      l_name: process.env.SEED_SUPER_ADMIN_LNAME?.trim() || "Admin",
    },
    terminalAdmin: {
      email:
        process.env.SEED_TERMINAL_ADMIN_EMAIL?.trim().toLowerCase() ||
        "terminaladmin@pasahero.com",
      password:
        process.env.SEED_TERMINAL_ADMIN_PASSWORD?.trim() || "TerminalAdmin@123",
      f_name: process.env.SEED_TERMINAL_ADMIN_FNAME?.trim() || "Terminal",
      l_name: process.env.SEED_TERMINAL_ADMIN_LNAME?.trim() || "Admin",
    },
  };
}

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function upsertAdminUser({
  email,
  plainPassword,
  f_name,
  l_name,
  role,
  assigned_terminal = null,
}) {
  const password = await hashPassword(plainPassword);
  const roleid = getRoleId(role);

  return User.findOneAndUpdate(
    { email },
    {
      $set: {
        f_name,
        l_name,
        email,
        password,
        role,
        roleid,
        status: USER_STATUS_ACTIVE,
        profile_image: "default.png",
        assigned_terminal,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
}

async function seedAdminAccess() {
  const mongoUri = requireMongoUri();
  const { superAdmin, terminalAdmin } = readCredentials();

  await mongoose.connect(mongoUri);
  console.log("📦 Connected to MongoDB");

  try {
    const defaultTerminal = await Terminal.findOne({ status: "active" })
      .sort({ createdAt: 1 })
      .lean();
    const assignedTerminalId = defaultTerminal?._id ?? null;

    const superAdminDoc = await upsertAdminUser({
      email: superAdmin.email,
      plainPassword: superAdmin.password,
      f_name: superAdmin.f_name,
      l_name: superAdmin.l_name,
      role: "super admin",
      assigned_terminal: null,
    });

    const terminalAdminDoc = await upsertAdminUser({
      email: terminalAdmin.email,
      plainPassword: terminalAdmin.password,
      f_name: terminalAdmin.f_name,
      l_name: terminalAdmin.l_name,
      role: "terminal admin",
      assigned_terminal: assignedTerminalId,
    });

    console.log("✅ Admin access seeding complete.");
    console.log(
      `   Super Admin: ${superAdminDoc.email} / ${superAdmin.password}`,
    );
    console.log(
      `   Terminal Admin: ${terminalAdminDoc.email} / ${terminalAdmin.password}`,
    );
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (isDirectRun) {
  seedAdminAccess()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Failed to seed admin access:", err.message);
      process.exit(1);
    });
}

export default seedAdminAccess;
