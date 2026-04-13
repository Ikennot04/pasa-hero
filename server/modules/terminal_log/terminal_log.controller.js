import { TerminalLogService } from "./terminal_log.service.js";

export const getAllTerminalLogs = async (req, res) => {
  try {
    const { terminalLogs, counts } = await TerminalLogService.getAllTerminalLogs();
    res.status(200).json({ success: true, data: terminalLogs, counts });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getTerminalLogsByTerminalId = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { terminalLogs, counts } =
      await TerminalLogService.getTerminalLogsByTerminalId(terminalId);
    res.status(200).json({ success: true, data: terminalLogs, counts });
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

export const deleteTerminalLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const terminalLog = await TerminalLogService.deleteTerminalLogById(id);

    if (!terminalLog) {
      return res
        .status(404)
        .json({ success: false, message: "Terminal log not found" });
    }

    res.status(200).json({
      success: true,
      message: "Terminal log deleted successfully",
      data: terminalLog,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
