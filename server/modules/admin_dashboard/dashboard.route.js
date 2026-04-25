import express from "express";
import {
  getActiveBusesPerRouteCount,
  getDashboardCounts,
  getRoutePerformanceReport,
  getTopSubscribedRoutesAndBuses,
  getTotalOccupancyCountPerRoute,
} from "./dashboard.controller.js";

const router = express.Router();

router.get("/counts", getDashboardCounts);
router.get("/active-buses-per-route-count", getActiveBusesPerRouteCount);
router.get("/total-occupancy-count-per-route", getTotalOccupancyCountPerRoute);
router.get("/route-performance-report", getRoutePerformanceReport);
router.get("/top-subscribed-routes-and-buses", getTopSubscribedRoutesAndBuses);

export default router;
