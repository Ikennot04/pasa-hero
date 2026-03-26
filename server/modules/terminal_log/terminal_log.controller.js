import { TerminalLogService } from "./terminal_log.service.js";

export const getAllTerminalLogs = async (req, res) => {
  try {
    const terminalLogs = await TerminalLogService.getAllTerminalLogs();
    res.status(200).json({ success: true, data: terminalLogs });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
