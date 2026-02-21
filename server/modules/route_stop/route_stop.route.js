import express from "express";
import {
  createRouteStop,
  getRouteStopsByRouteId,
  updateRouteStopById,
  deleteRouteStopById,
} from "./route_stop.controller.js";

const router = express.Router();

router.get("/route/:routeId", getRouteStopsByRouteId);
router.post("/", createRouteStop);
router.patch("/:id", updateRouteStopById);
router.delete("/:id", deleteRouteStopById);

export default router;
