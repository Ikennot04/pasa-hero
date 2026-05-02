import bcrypt from "bcrypt";
import User from "../modules/user/user.model.js";
import { getRoleId } from "../utils/roleMapper.js";

const SALT_ROUNDS = 10;
const USER_STATUS_ACTIVE = "active";

export const JOHN_SUPER_ADMIN = {
  f_name: "John",
  l_name: "Super",
  email: "johnsuper@gmail.com",
  password: "John@1234",
  role: "super admin",
};

export const JOHN_TERMINAL_ADMIN = {
  f_name: "John",
  l_name: "Terminal",
  email: "johnterminal@gmail.com",
  password: "John@1234",
  role: "terminal admin",
};

/**
 * Ensures John super / terminal admin accounts (bcrypt, login-compatible).
 * @param {import("mongoose").Types.ObjectId} smTerminalId - SM City Cebu terminal
 */
export default async function seedJohnAdminUsers(smTerminalId) {
  const hash = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
  const [superHash, terminalHash] = await Promise.all([
    hash(JOHN_SUPER_ADMIN.password),
    hash(JOHN_TERMINAL_ADMIN.password),
  ]);

  await User.updateOne(
    { email: JOHN_SUPER_ADMIN.email },
    {
      $set: {
        f_name: JOHN_SUPER_ADMIN.f_name,
        l_name: JOHN_SUPER_ADMIN.l_name,
        password: superHash,
        role: JOHN_SUPER_ADMIN.role,
        roleid: getRoleId(JOHN_SUPER_ADMIN.role),
        status: USER_STATUS_ACTIVE,
        firebase_id: "firebase_seed_super_john",
        profile_image: "default.png",
        assigned_terminal: null,
      },
    },
    { upsert: true },
  );

  await User.updateOne(
    { email: JOHN_TERMINAL_ADMIN.email },
    {
      $set: {
        f_name: JOHN_TERMINAL_ADMIN.f_name,
        l_name: JOHN_TERMINAL_ADMIN.l_name,
        password: terminalHash,
        role: JOHN_TERMINAL_ADMIN.role,
        roleid: getRoleId(JOHN_TERMINAL_ADMIN.role),
        status: USER_STATUS_ACTIVE,
        firebase_id: "firebase_seed_terminal_john",
        profile_image: "default.png",
        assigned_terminal: smTerminalId,
      },
    },
    { upsert: true },
  );

  console.log("✅ John admin users (login-ready):");
  console.log(`   Super admin: ${JOHN_SUPER_ADMIN.email}`);
  console.log(`   Terminal admin: ${JOHN_TERMINAL_ADMIN.email}`);
}
