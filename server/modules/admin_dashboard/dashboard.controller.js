import { DashboardService } from "./dashboard.service.js";

export const getTotalOccupancyCountPerRoute = async (req, res) => {
  try {
    const data = await DashboardService.getTotalOccupancyCountPerRoute();
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getDashboardCounts = async (req, res) => {
  try {
    const data = await DashboardService.getDashboardCounts();
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getActiveBusesPerRouteCount = async (req, res) => {
  try {
    const data = await DashboardService.getActiveBusesPerRouteCount();
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getRoutePerformanceReport = async (req, res) => {
  try {
    const data = await DashboardService.getRoutePerformanceReport();
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getTopSubscribedRoutesAndBuses = async (req, res) => {
  try {
    const data = await DashboardService.getTopSubscribedRoutesAndBuses();
    res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
