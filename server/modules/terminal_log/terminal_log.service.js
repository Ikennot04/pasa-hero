import TerminalLog from "./terminal_log.model.js";

export const TerminalLogService = {
  // GET ALL TERMINAL LOGS =============================================================
  async getAllTerminalLogs() {
    const terminalLogs = await TerminalLog.find().sort({ createdAt: -1 });
    return terminalLogs;
  },
};
