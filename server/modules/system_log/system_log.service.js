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

  async getSystemLogById(id) {
    const log = await SystemLog.findById(id).populate({
      path: "user_id",
      select: "f_name l_name email role",
    });
    return log;
  },

  async createSystemLog(systemLogData) {
    const created = await SystemLog.create(systemLogData);
    const log = await SystemLog.findById(created._id).populate({
      path: "user_id",
      select: "f_name l_name email role",
    });
    return log;
  },
};
