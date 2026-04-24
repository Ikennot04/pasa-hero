import express from "express";
import { getDashboardCounts } from "./dashboard.controller.js";

const router = express.Router();

router.get("/counts", getDashboardCounts);

export default router;
