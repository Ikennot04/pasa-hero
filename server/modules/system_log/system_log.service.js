import SystemLog from "./system_log.model.js";

export const SystemLogService = {
  async getAllSystemLogs() {
    const logs = await SystemLog.find()
      .populate({
        path: "user_id",
        select: "f_name l_name email role",
      })
      .sort({ createdAt: -1 });
    return logs;
  },
};
