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

export const getTerminalLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const terminalLog = await TerminalLogService.getTerminalLogById(id);

    if (!terminalLog) {
      return res
        .status(404)
        .json({ success: false, message: "Terminal log not found" });
    }

    res.status(200).json({ success: true, data: terminalLog });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const createTerminalLog = async (req, res) => {
  try {
    const terminalLogData = req.body;
    const terminalLog = await TerminalLogService.createTerminalLog(terminalLogData);
    res.status(201).json({ success: true, data: terminalLog });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
