import express from "express";
import {
  createRouteStop,
  getRouteStopsByRouteId,
  updateRouteStopById,
} from "./route_stop.controller.js";

const router = express.Router();

router.get("/route/:routeId", getRouteStopsByRouteId);
router.post("/", createRouteStop);
router.patch("/:id", updateRouteStopById);

export default router;
