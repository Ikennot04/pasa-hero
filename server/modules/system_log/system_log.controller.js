import { SystemLogService } from "./system_log.service.js";

export const getAllSystemLogs = async (req, res) => {
  try {
    const logs = await SystemLogService.getAllSystemLogs();
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getSystemLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await SystemLogService.getSystemLogById(id);

    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "System log not found" });
    }

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
