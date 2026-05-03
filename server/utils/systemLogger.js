import { SystemLogService } from "../modules/system_log/system_log.service.js";

/**
 * Fire-and-forget system log writer used by services to record actor actions.
 * Logging failures are swallowed (and console-logged) so they never bubble up
 * and break the user-facing operation. If `userId` is missing — for example,
 * when a request arrives without a Bearer token — the log is skipped silently.
 *
 * @param {object} params
 * @param {string|object} [params.userId]   Actor user id (or Mongo doc with _id)
 * @param {string} params.action            One of the values defined in
 *   `system_log.model.js` enum (e.g. "Login", "Create Operator").
 * @param {string} [params.description]     Free-form human-readable description.
 */
export async function logSystemEvent({ userId, action, description } = {}) {
  try {
    const resolvedUserId =
      userId && typeof userId === "object" && userId._id
        ? String(userId._id)
        : userId
          ? String(userId)
          : null;

    if (!resolvedUserId || !action) return;

    await SystemLogService.createSystemLog({
      user_id: resolvedUserId,
      action,
      description: description || undefined,
    });
  } catch (err) {
    console.error(
      `[systemLogger] Failed to record "${action}" event:`,
      err?.message || err,
    );
  }
}
