import express from "express";
import {
  createRouteStop,
  getRouteStopsByRouteId,
  updateRouteStopById,
  deleteRouteStopById,
  reorderRouteStops,
} from "./route_stop.controller.js";

const router = express.Router();

router.get("/route/:routeId", getRouteStopsByRouteId);
router.patch("/route/:routeId/reorder", reorderRouteStops);
router.post("/", createRouteStop);
router.patch("/:id", updateRouteStopById);
router.delete("/:id", deleteRouteStopById);

export default router;
