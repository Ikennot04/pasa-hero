import TerminalLog from "./terminal_log.model.js";

export const TerminalLogService = {
  // GET ALL TERMINAL LOGS =============================================================
  async getAllTerminalLogs() {
    const terminalLogs = await TerminalLog.find()
      .populate({
        path: "terminal_id",
        select: "terminal_name location_lat location_lng status",
      })
      .populate({
        path: "bus_id",
        select: "bus_number plate_number capacity status",
      })
      .populate({
        path: "reported_by",
        select: "f_name l_name email role status",
      })
      .populate({
        path: "confirmed_by",
        select: "f_name l_name email role status",
      })
      .sort({ createdAt: -1 });
    return terminalLogs;
  },
  // CREATE TERMINAL LOG ===============================================================
  async createTerminalLog(terminalLogData) {
    const terminalLog = await TerminalLog.create(terminalLogData);
    return terminalLog;
  },
};
