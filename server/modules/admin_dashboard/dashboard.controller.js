import { DashboardService } from "./dashboard.service.js";

export const getDashboardCounts = async (req, res) => {
  try {
    const data = await DashboardService.getDashboardCounts();
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
