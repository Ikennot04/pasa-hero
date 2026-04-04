import mongoose from "mongoose";
import SystemLog from "./system_log.model.js";

export const SystemLogService = {
  // GET ALL SYSTEM LOGS ===================================================================
  async getAllSystemLogs() {
    const logs = await SystemLog.find()
      .populate({
        path: "user_id",
        select: "f_name l_name email role",
      })
      .sort({ createdAt: -1 });
    return logs;
  },

  // GET SYSTEM LOG BY ID ===================================================================
  async getSystemLogById(id) {
    const log = await SystemLog.findById(id).populate({
      path: "user_id",
      select: "f_name l_name email role",
    });
    return log;
  },

  // CREATE SYSTEM LOG ===================================================================
  async createSystemLog(systemLogData) {
    const created = await SystemLog.create(systemLogData);
    const log = await SystemLog.findById(created._id).populate({
      path: "user_id",
      select: "f_name l_name email role",
    });
    return log;
  },

  // DELETE MANY SYSTEM LOGS ===================================================================
  async deleteManySystemLogs(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error("ids must be a non-empty array");
      err.statusCode = 400;
      throw err;
    }
    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (objectIds.length === 0) {
      const err = new Error("No valid system log ids provided");
      err.statusCode = 400;
      throw err;
    }
    const result = await SystemLog.deleteMany({ _id: { $in: objectIds } });
    return { deletedCount: result.deletedCount };
  },
};
