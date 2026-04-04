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
