import express from "express";
import {
  createRouteStop,
  getRouteStopsByRouteId,
} from "./route_stop.controller.js";

const router = express.Router();

router.get("/route/:routeId", getRouteStopsByRouteId);
router.post("/", createRouteStop);

export default router;
