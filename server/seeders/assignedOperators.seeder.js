import User from "../modules/user/user.model.js";
import { DEV_TERMINAL_ADMIN } from "./devAdminUsers.seeder.js";

const DEFAULT_OPERATOR_EMAILS = [
  "maria.santos@email.com",
  "rico.alvarez@email.com",
];

/**
 * Assign terminal operators to a terminal admin.
 * Defaults to Cha terminal admin and the two demo operators.
 *
 * @param {{
 *   terminalAdminEmail?: string,
 *   operatorEmails?: string[],
 *   fallbackTerminalId?: import("mongoose").Types.ObjectId|string|null,
 * }} [options]
 */
export default async function seedAssignedOperators(options = {}) {
  const terminalAdminEmail = options.terminalAdminEmail || DEV_TERMINAL_ADMIN.email;
  const operatorEmails = options.operatorEmails || DEFAULT_OPERATOR_EMAILS;

  const terminalAdmin = await User.findOne({ email: terminalAdminEmail }).select(
    "_id assigned_terminal role",
  );

  if (!terminalAdmin) {
    throw new Error(`Terminal admin not found: ${terminalAdminEmail}`);
  }
  if (terminalAdmin.role !== "terminal admin") {
    throw new Error(`User is not a terminal admin: ${terminalAdminEmail}`);
  }

  const assignedTerminalId = terminalAdmin.assigned_terminal || options.fallbackTerminalId;
  if (!assignedTerminalId) {
    throw new Error(
      `Terminal admin ${terminalAdminEmail} has no assigned_terminal. Provide fallbackTerminalId.`,
    );
  }

  const result = await User.updateMany(
    { role: "operator", email: { $in: operatorEmails } },
    {
      $set: {
        created_by: terminalAdmin._id,
        assigned_terminal: assignedTerminalId,
      },
    },
  );

  console.log(
    `✅ Assigned ${result.modifiedCount} operators to terminal admin ${terminalAdminEmail}`,
  );
  return result;
}
