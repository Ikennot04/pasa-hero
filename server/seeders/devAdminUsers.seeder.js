import bcrypt from "bcrypt";
import User from "../modules/user/user.model.js";

const SALT_ROUNDS = 10;

/** Super admin login for local / staging (super_admin app). */
export const DEV_SUPER_ADMIN = {
  f_name: "Indae",
  l_name: "Admin",
  email: "indae@gmail.com",
  password: "Indae@12345",
  role: "super admin",
};

/** Terminal admin login for local / staging (terminal app). */
export const DEV_TERMINAL_ADMIN = {
  f_name: "Cha",
  l_name: "Terminal",
  email: "cha@gmail.com",
  password: "Cha@12345",
  role: "terminal admin",
};

/**
 * Ensures dev admin accounts exist with bcrypt passwords (login-compatible).
 * @param {import("mongoose").Types.ObjectId} smTerminalId - SM City Cebu terminal for terminal admin assignment
 */
export default async function seedDevAdminUsers(smTerminalId) {
  const hash = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
  const [superHash, terminalHash] = await Promise.all([
    hash(DEV_SUPER_ADMIN.password),
    hash(DEV_TERMINAL_ADMIN.password),
  ]);

  await User.updateOne(
    { email: DEV_SUPER_ADMIN.email },
    {
      $set: {
        f_name: DEV_SUPER_ADMIN.f_name,
        l_name: DEV_SUPER_ADMIN.l_name,
        password: superHash,
        role: DEV_SUPER_ADMIN.role,
        status: "active",
        firebase_id: "firebase_seed_super_indae",
        profile_image: "default.png",
        assigned_terminal: null,
      },
    },
    { upsert: true },
  );

  await User.updateOne(
    { email: DEV_TERMINAL_ADMIN.email },
    {
      $set: {
        f_name: DEV_TERMINAL_ADMIN.f_name,
        l_name: DEV_TERMINAL_ADMIN.l_name,
        password: terminalHash,
        role: DEV_TERMINAL_ADMIN.role,
        status: "active",
        firebase_id: "firebase_seed_terminal_cha",
        profile_image: "default.png",
        assigned_terminal: smTerminalId,
      },
    },
    { upsert: true },
  );

  console.log("✅ Dev admin users (login-ready):");
  console.log(`   Super admin: ${DEV_SUPER_ADMIN.email}`);
  console.log(`   Terminal admin: ${DEV_TERMINAL_ADMIN.email}`);
}
