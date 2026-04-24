import express from "express";
import {
  getActiveBusesPerRouteCount,
  getDashboardCounts,
  getRoutePerformanceReport,
} from "./dashboard.controller.js";

const router = express.Router();

router.get("/counts", getDashboardCounts);
router.get("/active-buses-per-route-count", getActiveBusesPerRouteCount);
router.get("/route-performance-report", getRoutePerformanceReport);

export default router;
