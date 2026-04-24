import express from "express";
import {
  getActiveBusesPerRouteCount,
  getDashboardCounts,
} from "./dashboard.controller.js";

const router = express.Router();

router.get("/counts", getDashboardCounts);
router.get("/active-buses-per-route-count", getActiveBusesPerRouteCount);

export default router;
